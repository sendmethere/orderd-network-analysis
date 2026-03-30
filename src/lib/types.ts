export const CODES = ['StartProblem', 'EndProblem', 'PlanningTool', 'MoveHistory', 'TileChange', 'Reading', 'Diagram'] as const;
export type CodeName = string;

export interface EventRow {
  UserID: string;
  Condition: 'Active' | 'Passive';
  ActivityNumber: number;
  Timestamp: string;
  [code: string]: string | number;
}

export interface AdjacencyMatrix {
  [ground: string]: { [response: string]: number };
}

export interface UnitData {
  userID: string;
  condition: 'Active' | 'Passive';
  adjacencyMatrix: AdjacencyMatrix;
  normalizedVector: number[];
  onaScore: { x: number; y: number };
  responseCounts: { [code: string]: number };  // how many times each code appeared as response
  selfConnectionCounts: { [code: string]: number };
}

export interface NodePosition {
  code: CodeName;
  x: number;
  y: number;
  responseCount: number;
  selfConnectionCount: number;
}

export interface Edge {
  ground: CodeName;
  response: CodeName;
  weightActive: number;   // mean weight for Active group
  weightPassive: number;  // mean weight for Passive group
  weightDiff: number;     // weightActive - weightPassive
  dominantGroup: 'Active' | 'Passive' | 'Equal';
}

export interface OnaResult {
  units: UnitData[];
  nodes: NodePosition[];
  edges: Edge[];
  activeMean: { x: number; y: number };
  passiveMean: { x: number; y: number };
  activeCI: { x: [number, number]; y: [number, number] };
  passiveCI: { x: [number, number]; y: [number, number] };
}

export interface StanzaEntry {
  rowIndex: number;
  userID: string;
  activityNumber: number;
  activeCodes: CodeName[];
}
