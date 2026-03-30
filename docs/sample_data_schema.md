```markdown
# Sample Data Schema (sample_data_schema.md)

이 문서는 샘플 데이터를 DB에 적재하거나 Mock 데이터 형태로 다루는 에이전트를 위한 데이터 스펙 및 도메인 지식 문서입니다. ONA 웹 도구의 교육적 맥락을 시연하기 위해 **지속 가능 발전 교육용 게임인 '퓨쳐월드(Futureworld)'의 로그 데이터**를 기반으로 설계되었습니다.

## 1. 데이터 개요 및 분석 단위
*   **데이터 출처:** 참여자가 가상 세계 내에서 자원을 관리하고 환경 문제를 해결하는 과정을 기록한 클릭 추적(Trace log) 데이터입니다.
*   **분석 단위 (Units):** 각 개별 학습자(`UserName` 또는 `UserID`)가 분석 단위가 됩니다.
*   **대화/컨텍스트 (Conversations):** 각 학습자가 개별 문제(Activity/Problem)를 해결하는 구간이 하나의 독립된 컨텍스트로 묶여야 합니다.

## 2. 노드 (변인/코드) 정의
로그 데이터 내에서 식별되고 네트워크 상의 '노드'로 렌더링 되어야 할 7가지 핵심 이벤트 코드입니다.
데이터 세트의 각 행(이벤트)은 아래 코드들 중 어떤 이벤트가 발생했는지를 나타내는 이진(Binary) 값(0 또는 1)을 포함해야 합니다.

*   **시스템 이벤트**
    *   `StartProblem`: 문제가 시작됨을 나타내는 시스템 자동 이벤트.
    *   `EndProblem`: 문제가 성공적으로 해결되어 종료됨을 나타내는 시스템 자동 이벤트.
*   **자기 조절 학습 행동 (Self-regulated learning behaviors)**
    *   `PlanningTool`: 목표를 설정하고 계획을 수립하는 행동. 문제 시작 시 자동으로 실행되지만, 학습자가 주도적으로 다시 클릭하여 계획을 점검할 수 있습니다.
    *   `MoveHistory`: 타일 교체 기록을 확인하여 자신의 플레이 과정을 되돌아보는(Self-reflection) 행동.
*   **인지적 학습 및 문제 해결 행동 (Cognitive & Problem-solving behaviors)**
    *   `TileChange`: 문제가 있는 환경 타일을 다른 옵션으로 교체하기 위해 답안을 제출하는 핵심 문제 해결 행동.
    *   `Reading`: 타일 교체 전 더 많은 정보를 얻기 위해 텍스트 정보를 읽는 탐색 및 학습 행동.
    *   `Diagram`: 환경 상태 등을 보여주는 다이어그램을 확인하는 학습 행동.

## 3. 비교 집단 (Groups) 및 메타데이터 정의
두 집단의 게임 플레이 패턴(ONA 네트워크)을 대조하여 시각화하기 위해, **학습자의 '계획 도구(PlanningTool)' 활용 횟수를 기준**으로 그룹을 분류하는 메타데이터 컬럼(`Condition`)이 필요합니다.

*   **적극적 계획 집단 (Active Planning Group):** 전체 참여자의 평균 `PlanningTool` 활용 횟수보다 높은 횟수를 기록한 학습자 그룹. 렌더링 시 **파란색**으로 구분합니다.
*   **소극적 계획 집단 (Passive Planning Group):** 전체 참여자의 평균 `PlanningTool` 활용 횟수 이하를 기록한 학습자 그룹. 렌더링 시 **빨간색**으로 구분합니다.

## 4. 데이터 스키마 예시 (Table Structure)
Mock 데이터를 생성할 때 아래의 구조를 따르도록 합니다.

| 컬럼명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `UserID` | String | 학습자의 고유 식별자 |
| `Condition` | String | `Active` (적극적 계획 집단) 또는 `Passive` (소극적 계획 집단) |
| `ActivityNumber` | Integer | 게임 내 스테이지/문제 번호 |
| `Timestamp` | DateTime | 이벤트 발생 시간 |
| `StartProblem` | Integer(0/1) | 해당 이벤트가 문제 시작인지 여부 |
| `EndProblem` | Integer(0/1) | 해당 이벤트가 문제 종료인지 여부 |
| `PlanningTool` | Integer(0/1) | 계획 도구 사용 여부 |
| `Reading` | Integer(0/1) | 읽기 행동 여부 |
| `Diagram` | Integer(0/1) | 다이어그램 확인 행동 여부 |
| `MoveHistory` | Integer(0/1) | 움직임 내역 확인 여부 |
| `TileChange` | Integer(0/1) | 타일 교체(문제 해결) 행동 여부 |

**[데이터 생성 팁 (Agent를 위한 조언)]**
Mock 데이터 생성 시, **적극적 계획 집단(`Condition: Active`)의 데이터는 `PlanningTool`과 `Reading`, `Diagram` 행동이 연이어 발생하는 패턴을 더 자주 포함**하도록 가중치를 두어 생성하십시오. **소극적 계획 집단(`Condition: Passive`)의 경우 `TileChange` 위주의 단순 반복 패턴**이 자주 발생하도록 데이터를 구성하면 빼기 네트워크(Subtracted Network) 시연 시 훌륭한 대비를 보여줄 수 있습니다.
```