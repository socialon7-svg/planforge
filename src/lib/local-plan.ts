import type { DiagnosisStatus, GeneratedPlan, IdeaInput, PlanSection } from "@/types/plan";
import { sectionLabels } from "@/lib/sections";

function value(text: string, fallback = "추가 입력 필요"): string {
  return text.trim() || fallback;
}

function section(key: keyof Omit<GeneratedPlan, "selfDiagnosis">, body: string): PlanSection {
  return {
    title: sectionLabels[key],
    body: body.trim(),
  };
}

function status(requiredText: string): DiagnosisStatus {
  if (!requiredText.trim()) return "missing";
  return requiredText.trim().length >= 30 ? "good" : "warning";
}

export function generateLocalFallbackPlan(input: IdeaInput): GeneratedPlan {
  const itemName = value(input.itemName);
  const customers = value(input.customers);
  const problem = value(input.customerProblem);
  const solution = value(input.solution);
  const outputs = value(input.targetOutputs);

  return {
    basicInfo: section(
      "basicInfo",
      `
- 창업아이템명: ${itemName}
- 산업 분야: ${value(input.industry)}
- 주요 고객: ${customers}
- 현재 준비 상태: ${value(input.currentStatus)}
- 예상 정부지원사업비: ${value(input.expectedBudget)}
- 목표 산출물: ${outputs}
`,
    ),
    itemSummary: section(
      "itemSummary",
      `
${itemName}은/는 ${customers}이/가 겪는 문제를 해결하기 위한 사업화 아이템이다. 핵심 방향은 "${value(input.oneLine)}"이며, 협약기간 내에는 MVP 구현, 초기 고객 검증, 산출물 확보를 우선 목표로 한다.

본 초안은 입력 정보를 기준으로 작성된 PSST 형식의 1차 사업계획서이다. 세부 시장 수치, 고객 인터뷰 결과, 비용 산출 근거는 제출 전 추가 검증 필요 항목으로 관리한다.
`,
    ),
    problem: section(
      "problem",
      `
시장 및 업무 환경 변화로 인해 ${customers}의 운영 효율, 비용 관리, 서비스 품질 개선 요구가 높아지고 있다. 그러나 현재 고객은 다음과 같은 문제를 반복적으로 경험하고 있다.

- 고객 고통: ${problem}
- 기존 대안의 한계: ${value(input.competitors, "수기 업무, 범용 도구, 기존 대체재")}은/는 특정 고객 업무 흐름에 맞춘 자동화와 검증 체계가 부족하다.
- 해결 필요성: 문제 해결이 지연될 경우 시간 비용 증가, 업무 누락, 고객 대응 품질 저하가 발생할 수 있으므로 MVP 수준의 빠른 검증과 현장 적용이 필요하다.
`,
    ),
    solution: section(
      "solution",
      `
해결 방식은 ${solution}으로 정의한다. 협약기간 내 MVP는 고객이 가장 자주 겪는 핵심 문제를 먼저 처리하는 범위로 구성한다.

- 핵심 기능: ${value(input.coreTech)}
- MVP 범위: 입력 데이터 수집, 핵심 기능 구현, 사용자 화면, 결과 리포트, 초기 고객 피드백 반영
- 차별성: 범용 도구가 아니라 ${customers}의 실제 업무 흐름과 산출물 기준에 맞춘 실행형 기능을 제공한다.
`,
    ),
    market: section(
      "market",
      `
초기 목표시장은 ${customers}으로 설정한다. 첫 진입은 문제 강도가 높고 의사결정 구조가 비교적 명확한 고객군을 우선 대상으로 한다.

- 목표시장: ${value(input.industry)} 영역의 실무 고객
- 초기 고객: 도입 필요성이 높고 실증 협력이 가능한 소규모 고객 또는 기관
- 확장시장: MVP 검증 후 유사 업무를 가진 인접 산업 및 다점포/기관 고객으로 확장
- 시장 규모 및 통계: 현재 초안에서는 정량 수치를 단정하지 않으며, 제출 전 공신력 있는 자료로 추가 검증 필요
`,
    ),
    competitor: section(
      "competitor",
      `
경쟁군은 ${value(input.competitors, "수기 처리 방식, 범용 소프트웨어, 기존 대체 서비스")}으로 구분할 수 있다.

- 기존 방식 한계: 고객 업무 맥락에 맞춘 자동화, 결과 추적, 산출물 관리가 제한적이다.
- 차별화 포인트: ${itemName}은/는 특정 고객군의 반복 문제를 중심으로 기능 범위를 좁히고, 검증 가능한 산출물과 실행 과제를 제공하는 데 초점을 둔다.
- 검증 방향: 초기 고객 인터뷰, 파일럿 사용성 테스트, 전후 업무시간 비교를 통해 차별성을 확인한다.
`,
    ),
    businessModel: section(
      "businessModel",
      `
수익모델은 ${value(input.revenueModel)}을/를 기본으로 한다.

- 수익원: 구독료, 구축/온보딩 비용, 고도화 기능 사용료 중 사업 특성에 맞는 항목을 단계적으로 적용
- 가격/과금 방식: 초기에는 파일럿 고객 대상 할인 또는 무료 PoC 후 유료 전환 기준을 설정
- 판매 채널: 직접 영업, 기관 협력, 파트너 추천, 온라인 데모 신청 채널을 병행
`,
    ),
    scaleUp: section(
      "scaleUp",
      `
초기 진입은 ${customers} 중 문제 인식이 높은 고객을 대상으로 진행한다.

- 초기 진입: 3~5개 고객 또는 협력기관을 선정해 MVP 사용성과 문제 해결 효과를 검증
- 실증/검증: 사용 전후 업무시간, 오류 감소, 만족도, 재사용 의향을 지표로 관리
- 파트너십: 고객 접점이 있는 기관, 산업 협회, 솔루션 파트너와 협력해 실증 사례를 확보
- 확장 전략: 검증된 기능을 패키지화하고, 유사 고객군으로 반복 판매 가능한 구조를 만든다.
`,
    ),
    budget: section(
      "budget",
      `
예상 정부지원사업비 ${value(input.expectedBudget)}은/는 MVP 개발과 고객 검증 산출물 확보에 우선 배분한다.

- 개발비: 핵심 기능 구현, 사용자 화면, 데이터 처리 구조 구축
- 실증비: 고객 인터뷰, 파일럿 운영, 사용성 테스트, 검증 리포트 작성
- 사업화비: 데모 자료, 랜딩 페이지, 세일즈 자료, 초기 고객 확보 활동
- 산출근거: 모든 비용은 ${outputs} 확보와 직접 연결되도록 집행 기준을 설정한다.
`,
    ),
    roadmap: section(
      "roadmap",
      `
- 협약기간 내: 요구사항 정리, MVP 개발, 초기 고객 검증, 개선사항 반영, 결과 리포트 작성
- 1년차: 유료 베타 고객 확보, 반복 기능 안정화, 가격 정책 검증, 초기 매출 창출
- 2~3년차: 인접 고객군 확장, 파트너 채널 확보, 고도화 기능 출시, 재구매/재계약 구조 구축
`,
    ),
    team: section(
      "team",
      `
팀 구성은 ${value(input.team)}으로 제시되어 있다.

- 대표자/기획 역할: 고객 문제 정의, 사업화 전략, 실증 고객 발굴을 담당
- 개발/제품 역할: MVP 구현, 핵심 기능 개발, 사용성 개선을 담당
- 부족역량 보완계획: 법률, 회계, 디자인, 보안, 산업 전문성 등 내부에 부족한 영역은 외부 전문가 또는 협력기관 자문으로 보완한다.
`,
    ),
    partners: section(
      "partners",
      `
협력기관은 실증 고객 확보, 산업 전문성 보완, 판매 채널 확대 목적에 맞춰 단계적으로 구성한다.

- 협력기관 유형: 고객 접점 보유 기관, 산업 협회, 기술 자문기관, 초기 도입 파트너
- 활용 목적: 파일럿 운영, 현장 피드백 수집, 사업화 검증, 레퍼런스 확보
- 협력 시점: MVP 기획 직후 후보 기관을 발굴하고, 베타 테스트 전 협력 범위와 산출물을 확정한다.
`,
    ),
    selfDiagnosis: [
      {
        label: "문제 인식 구체성",
        status: status(input.customerProblem),
        comment: input.customerProblem.trim() ? "고객 문제를 입력값 기반으로 구체화했습니다." : "고객 문제를 더 구체적으로 입력해야 합니다.",
      },
      {
        label: "고객군 명확성",
        status: status(input.customers),
        comment: input.customers.trim() ? "초기 고객군이 식별되어 있습니다." : "초기 고객군 정의가 필요합니다.",
      },
      {
        label: "MVP 수준 해결책 구체성",
        status: status(`${input.solution} ${input.coreTech}`),
        comment: "MVP 범위는 핵심 기능과 검증 산출물 중심으로 보완했습니다.",
      },
      {
        label: "경쟁 대안 및 차별성",
        status: input.competitors.trim() ? "good" : "warning",
        comment: input.competitors.trim() ? "경쟁 대안이 입력되어 차별화 구조를 작성했습니다." : "경쟁 대안 입력이 부족해 일반 대체재 기준으로 작성했습니다.",
      },
      {
        label: "사업화 실행 가능성",
        status: status(input.revenueModel),
        comment: "수익모델, 판매 채널, 초기 검증 흐름을 연결했습니다.",
      },
      {
        label: "사업비와 산출물 연계성",
        status: status(`${input.expectedBudget} ${input.targetOutputs}`),
        comment: "예산 항목을 목표 산출물과 연결했습니다.",
      },
      {
        label: "팀 역량 및 보완계획",
        status: status(input.team),
        comment: "팀 역할과 부족역량 보완계획을 포함했습니다.",
      },
    ],
  };
}
