import { CODES, CodeName, EventRow, AdjacencyMatrix, UnitData, NodePosition, Edge, OnaResult, StanzaEntry } from './types';
import { Matrix, SVD } from 'ml-matrix';

/** Step 1: Build adjacency matrix from moving stanza window */
function buildAdjacencyMatrix(
  rows: EventRow[],
  windowSize: number,
  codes: readonly string[]
): AdjacencyMatrix {
  const matrix: AdjacencyMatrix = {};
  for (const ground of codes) {
    matrix[ground] = {};
    for (const response of codes) {
      matrix[ground][response] = 0;
    }
  }

  for (let i = 1; i < rows.length; i++) {
    const responseRow = rows[i];
    const responseCodes = codes.filter(c => responseRow[c] === 1);
    if (responseCodes.length === 0) continue;

    const groundStart = Math.max(0, i - (windowSize - 1));
    for (let g = groundStart; g < i; g++) {
      const groundRow = rows[g];
      const groundCodes = codes.filter(c => groundRow[c] === 1);
      for (const gc of groundCodes) {
        for (const rc of responseCodes) {
          matrix[gc][rc]++;
        }
      }
    }
  }

  return matrix;
}

/** Step 2: Flatten matrix to vector (row-major, includes diagonal = self-connections) */
function flattenMatrix(matrix: AdjacencyMatrix, codes: readonly string[]): number[] {
  const vec: number[] = [];
  for (const ground of codes) {
    for (const response of codes) {
      vec.push(matrix[ground][response]);
    }
  }
  return vec;
}

/** Step 3: Spherical normalization - divide by L2 magnitude */
function sphericalNormalize(vec: number[]): number[] {
  const magnitude = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  if (magnitude === 0) return vec.map(() => 0);
  return vec.map(v => v / magnitude);
}

/** Count response occurrences and self-connections per code */
function computeCodeStats(matrix: AdjacencyMatrix, codes: readonly string[]): {
  responseCounts: Record<string, number>;
  selfConnectionCounts: Record<string, number>;
} {
  const responseCounts: Record<string, number> = {};
  const selfConnectionCounts: Record<string, number> = {};
  for (const code of codes) {
    responseCounts[code] = codes.reduce((sum, g) => sum + matrix[g][code], 0);
    selfConnectionCounts[code] = matrix[code][code];
  }
  return { responseCounts, selfConnectionCounts };
}

/** Step 4b: Means Rotation for two-group comparison */
function meansRotation(
  vectors: number[][],
  conditions: Array<'Active' | 'Passive'>
): { scores: Array<{x: number, y: number}> } {
  if (vectors.length === 0) return { scores: [] };

  const activeVecs = vectors.filter((_, i) => conditions[i] === 'Active');
  const passiveVecs = vectors.filter((_, i) => conditions[i] === 'Passive');

  const vecLen = vectors[0].length;

  const meanActive = new Array(vecLen).fill(0);
  const meanPassive = new Array(vecLen).fill(0);

  activeVecs.forEach(v => v.forEach((x, j) => { meanActive[j] += x / activeVecs.length; }));
  passiveVecs.forEach(v => v.forEach((x, j) => { meanPassive[j] += x / passiveVecs.length; }));

  const diff = meanActive.map((a, j) => a - meanPassive[j]);
  const diffMag = Math.sqrt(diff.reduce((s, d) => s + d * d, 0));
  const mr1 = diffMag > 0 ? diff.map(d => d / diffMag) : diff;

  const projections = vectors.map(v => v.reduce((s, x, j) => s + x * mr1[j], 0));
  const residuals = vectors.map((v, i) => v.map((x, j) => x - projections[i] * mr1[j]));

  const Xr = new Matrix(residuals);
  const grandMean = Xr.mean('column');
  const Xrc = Xr.subRowVector(grandMean);

  let mr2: number[];
  try {
    const svd = new SVD(Xrc, { autoTranspose: true });
    mr2 = svd.rightSingularVectors.getColumn(0);
  } catch {
    mr2 = new Array(vecLen).fill(0);
    mr2[1] = 1;
  }

  const scores = vectors.map(v => ({
    x: v.reduce((s, x, j) => s + x * mr1[j], 0),
    y: v.reduce((s, x, j) => s + x * mr2[j], 0),
  }));

  return { scores };
}

/** Step 5: Co-registration */
function coRegistration(
  normalizedVectors: number[][],
  onaScores: Array<{x: number, y: number}>,
  numUnits: number,
  N: number,
  codes: readonly string[]
): NodePosition[] {
  const M: number[][] = [];

  for (let i = 0; i < numUnits; i++) {
    const row: number[] = new Array(N).fill(0);
    const vec = normalizedVectors[i];
    for (let g = 0; g < N; g++) {
      for (let r = 0; r < N; r++) {
        const w = vec[g * N + r];
        row[g] += w * 0.5;
        row[r] += w * 0.5;
      }
    }
    M.push(row);
  }

  const Mmat = new Matrix(M);
  const Px = Matrix.columnVector(onaScores.map(s => s.x));
  const Py = Matrix.columnVector(onaScores.map(s => s.y));

  let nodeX: number[];
  let nodeY: number[];

  try {
    const svd = new SVD(Mmat, { autoTranspose: true });
    const threshold = 1e-10;
    const U = svd.leftSingularVectors;
    const Sv = svd.diagonal;
    const V = svd.rightSingularVectors;

    const minDim = Math.min(Mmat.rows, Mmat.columns);
    const SinvDiag = Sv.slice(0, minDim).map(s => Math.abs(s) > threshold ? 1 / s : 0);

    const UtPx = new Array(minDim).fill(0);
    const UtPy = new Array(minDim).fill(0);
    for (let j = 0; j < minDim; j++) {
      for (let i = 0; i < numUnits; i++) {
        UtPx[j] += U.get(i, j) * Px.get(i, 0);
        UtPy[j] += U.get(i, j) * Py.get(i, 0);
      }
      UtPx[j] *= SinvDiag[j];
      UtPy[j] *= SinvDiag[j];
    }

    nodeX = new Array(N).fill(0);
    nodeY = new Array(N).fill(0);
    for (let k = 0; k < N; k++) {
      for (let j = 0; j < minDim; j++) {
        nodeX[k] += V.get(k, j) * UtPx[j];
        nodeY[k] += V.get(k, j) * UtPy[j];
      }
    }
  } catch {
    nodeX = codes.map((_, k) => Math.cos((2 * Math.PI * k) / N));
    nodeY = codes.map((_, k) => Math.sin((2 * Math.PI * k) / N));
  }

  return codes.map((code, k) => ({
    code,
    x: nodeX[k],
    y: nodeY[k],
    responseCount: 0,
    selfConnectionCount: 0,
  }));
}

function computeConfidenceInterval(values: number[]): [number, number] {
  if (values.length === 0) return [0, 0];
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const std = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(values.length - 1, 1));
  const se = std / Math.sqrt(values.length);
  return [mean - 1.96 * se, mean + 1.96 * se];
}

/** Main ONA pipeline */
export function computeONA(
  data: EventRow[],
  windowSize: number = 7,
  codes: readonly string[] = CODES
): OnaResult {
  const N = codes.length;

  const userMap = new Map<string, EventRow[]>();
  for (const row of data) {
    if (!userMap.has(row.UserID)) userMap.set(row.UserID, []);
    userMap.get(row.UserID)!.push(row);
  }

  const units: UnitData[] = [];

  for (const [userID, rows] of userMap) {
    rows.sort((a, b) => {
      if (a.ActivityNumber !== b.ActivityNumber) return a.ActivityNumber - b.ActivityNumber;
      return new Date(a.Timestamp as string).getTime() - new Date(b.Timestamp as string).getTime();
    });

    const userMatrix: AdjacencyMatrix = {};
    for (const g of codes) {
      userMatrix[g] = {};
      for (const r of codes) userMatrix[g][r] = 0;
    }

    const activityMap = new Map<number, EventRow[]>();
    for (const row of rows) {
      if (!activityMap.has(row.ActivityNumber)) activityMap.set(row.ActivityNumber, []);
      activityMap.get(row.ActivityNumber)!.push(row);
    }

    for (const [, actRows] of activityMap) {
      const actMatrix = buildAdjacencyMatrix(actRows, windowSize, codes);
      for (const g of codes) {
        for (const r of codes) {
          userMatrix[g][r] += actMatrix[g][r];
        }
      }
    }

    const rawVec = flattenMatrix(userMatrix, codes);
    const normalizedVec = sphericalNormalize(rawVec);
    const { responseCounts, selfConnectionCounts } = computeCodeStats(userMatrix, codes);
    const condition = rows[0].Condition;

    units.push({
      userID,
      condition,
      adjacencyMatrix: userMatrix,
      normalizedVector: normalizedVec,
      onaScore: { x: 0, y: 0 },
      responseCounts,
      selfConnectionCounts,
    });
  }

  if (units.length === 0) {
    return {
      units: [],
      nodes: codes.map((code, k) => ({
        code,
        x: Math.cos((2 * Math.PI * k) / N),
        y: Math.sin((2 * Math.PI * k) / N),
        responseCount: 0,
        selfConnectionCount: 0,
      })),
      edges: [],
      activeMean: { x: 0, y: 0 },
      passiveMean: { x: 0, y: 0 },
      activeCI: { x: [0, 0], y: [0, 0] },
      passiveCI: { x: [0, 0], y: [0, 0] },
    };
  }

  const vectors = units.map(u => u.normalizedVector);
  const conditions = units.map(u => u.condition);

  const { scores } = meansRotation(vectors, conditions);
  scores.forEach((score, i) => { units[i].onaScore = score; });

  const rawNodes = coRegistration(vectors, scores, units.length, N, codes);

  const totalResponseCounts: Record<string, number> = {};
  const totalSelfCounts: Record<string, number> = {};
  for (const code of codes) {
    totalResponseCounts[code] = units.reduce((s, u) => s + (u.responseCounts[code] ?? 0), 0);
    totalSelfCounts[code] = units.reduce((s, u) => s + (u.selfConnectionCounts[code] ?? 0), 0);
  }

  const nodes: NodePosition[] = rawNodes.map(n => ({
    ...n,
    responseCount: totalResponseCounts[n.code] ?? 0,
    selfConnectionCount: totalSelfCounts[n.code] ?? 0,
  }));

  const activeUnits = units.filter(u => u.condition === 'Active');
  const passiveUnits = units.filter(u => u.condition === 'Passive');

  function meanVec(us: UnitData[]): number[] {
    if (us.length === 0) return new Array(N * N).fill(0);
    return us[0].normalizedVector.map((_, j) => us.reduce((s, u) => s + u.normalizedVector[j], 0) / us.length);
  }

  const activeMeanVec = meanVec(activeUnits);
  const passiveMeanVec = meanVec(passiveUnits);

  const edges: Edge[] = [];
  for (let gi = 0; gi < N; gi++) {
    for (let ri = 0; ri < N; ri++) {
      const idx = gi * N + ri;
      const wA = activeMeanVec[idx];
      const wP = passiveMeanVec[idx];
      const diff = wA - wP;
      if (wA > 0.001 || wP > 0.001) {
        edges.push({
          ground: codes[gi],
          response: codes[ri],
          weightActive: wA,
          weightPassive: wP,
          weightDiff: diff,
          dominantGroup: Math.abs(diff) < 0.001 ? 'Equal' : (diff > 0 ? 'Active' : 'Passive'),
        });
      }
    }
  }

  const activeMean = {
    x: activeUnits.reduce((s, u) => s + u.onaScore.x, 0) / Math.max(activeUnits.length, 1),
    y: activeUnits.reduce((s, u) => s + u.onaScore.y, 0) / Math.max(activeUnits.length, 1),
  };
  const passiveMean = {
    x: passiveUnits.reduce((s, u) => s + u.onaScore.x, 0) / Math.max(passiveUnits.length, 1),
    y: passiveUnits.reduce((s, u) => s + u.onaScore.y, 0) / Math.max(passiveUnits.length, 1),
  };

  const activeCI = {
    x: computeConfidenceInterval(activeUnits.map(u => u.onaScore.x)) as [number, number],
    y: computeConfidenceInterval(activeUnits.map(u => u.onaScore.y)) as [number, number],
  };
  const passiveCI = {
    x: computeConfidenceInterval(passiveUnits.map(u => u.onaScore.x)) as [number, number],
    y: computeConfidenceInterval(passiveUnits.map(u => u.onaScore.y)) as [number, number],
  };

  return { units, nodes, edges, activeMean, passiveMean, activeCI, passiveCI };
}

/** Get stanza window details for a specific edge */
export function getStanzaDetails(
  data: EventRow[],
  groundCode: CodeName,
  responseCode: CodeName,
  windowSize: number,
  codes: readonly string[] = CODES
): StanzaEntry[] {
  const entries: StanzaEntry[] = [];

  const grouped = new Map<string, EventRow[]>();
  for (const row of data) {
    const key = `${row.UserID}_${row.ActivityNumber}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(row);
  }

  for (const [, rows] of grouped) {
    rows.sort((a, b) => new Date(a.Timestamp as string).getTime() - new Date(b.Timestamp as string).getTime());

    for (let i = 1; i < rows.length; i++) {
      const responseRow = rows[i];
      if (responseRow[responseCode] !== 1) continue;

      const groundStart = Math.max(0, i - (windowSize - 1));
      for (let g = groundStart; g < i; g++) {
        const groundRow = rows[g];
        if (groundRow[groundCode] !== 1) continue;

        entries.push({
          rowIndex: i,
          userID: responseRow.UserID as string,
          activityNumber: responseRow.ActivityNumber as number,
          activeCodes: codes.filter(c => responseRow[c] === 1),
        });
        break;
      }
    }
  }

  return entries.slice(0, 20);
}
