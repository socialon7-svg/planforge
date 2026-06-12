import type { GeneratedPlan, IdeaInput, SectionKey } from "@/types/plan";

function value(text: string, fallback: string): string {
  return text.trim() || fallback;
}

function appendUntil(body: string, additions: string[], minLength: number): string {
  const parts = [body.trim()];
  for (const addition of additions) {
    if (parts.join("\n").length >= minLength) break;
    if (addition.trim()) parts.push(addition.trim());
  }
  if (parts.join("\n").length < minLength) {
    parts.push(
      "- 세부 실행은 담당자, 일정, 산출물, 검증지표를 함께 관리하고 고객 피드백을 다음 개선 범위에 반영한다. 정량 수치와 시장 통계가 필요한 항목은 추가 검증 필요로 표시한 뒤 외부 자료 확인 후 보완한다.",
    );
  }
  if (parts.join("\n").length < minLength) {
    parts.push(
      "- 평가 관점에서는 문제의 구체성, MVP 범위의 현실성, 사업비와 산출물의 연결성, 협약기간 내 실행 가능성을 함께 확인할 수 있도록 근거와 실행 순서를 명확히 제시한다.",
    );
  }
  if (parts.join("\n").length < minLength) {
    parts.push(
      "- 이후 보완 시에는 고객 인터뷰, 파일럿 결과, 견적서, 협력 의향 등 확인 가능한 자료를 붙여 계획의 신뢰도를 높인다.",
    );
  }
  return parts.filter(Boolean).join("\n");
}

function enrichSection(
  plan: GeneratedPlan,
  key: SectionKey,
  minLength: number,
  additions: string[],
): GeneratedPlan {
  const current = plan[key].body.trim();
  if (current.length >= minLength) return plan;
  return {
    ...plan,
    [key]: {
      ...plan[key],
      body: appendUntil(current, additions, minLength),
    },
  };
}

export function ensurePlanDepth(plan: GeneratedPlan, input: IdeaInput): GeneratedPlan {
  const itemName = value(input.itemName, "본 창업아이템");
  const customers = value(input.customers, "초기 목표 고객");
  const industry = value(input.industry, "목표 산업 분야");
  const customerProblem = value(input.customerProblem, "고객이 반복적으로 겪는 비용, 시간, 품질, 업무 비효율 문제");
  const solution = value(input.solution, "고객 문제를 직접 줄이는 MVP 중심 해결 방식");
  const coreTech = value(input.coreTech, "핵심 기능과 운영 데이터 기반 검증 체계");
  const competitors = value(input.competitors, "수기 처리, 범용 도구, 기존 대체 서비스");
  const revenueModel = value(input.revenueModel, "구독료, 초기 구축비, 사용량 기반 과금");
  const currentStatus = value(input.currentStatus, "고객 문제 검증과 MVP 기획을 진행 중인 상태");
  const team = value(input.team, "기획, 개발, 고객 검증 역할을 중심으로 구성된 팀");
  const expectedBudget = value(input.expectedBudget, "정부지원사업비");
  const outputs = value(input.targetOutputs, "MVP, 고객 검증 결과, 사업화 자료");
  const notes = value(input.notes, "공공지원사업 제출용 실무형 문체");

  let enriched = plan;

  enriched = enrichSection(enriched, "itemSummary", 260, [
    `- ${itemName}은 ${customers}가 겪는 문제를 MVP 기능으로 검증하고, ${outputs}을 사업기간 내 산출물로 확보하는 것을 목표로 한다.`,
    `- 작성 방향은 ${notes}를 반영해 과장된 홍보 문구보다 고객 문제, 실행계획, 검증방법, 사업화 연계성을 중심으로 정리한다.`,
  ]);

  enriched = enrichSection(enriched, "problem", 430, [
    `- 목표 고객인 ${customers}는 ${customerProblem}를 반복적으로 경험하고 있으며, 이 문제는 비용 증가와 의사결정 지연으로 이어진다.`,
    `- 기존 대안인 ${competitors}는 개별 업무에는 활용 가능하지만 고객 맥락에 맞춘 자동화, 검증 지표, 산출물 관리가 부족하다.`,
    `- 따라서 ${itemName}은 문제의 빈도와 비용을 초기 고객 인터뷰, 파일럿 사용 기록, 전후 비교 지표로 검증하면서 해결 필요성을 입증해야 한다.`,
  ]);

  enriched = enrichSection(enriched, "solution", 430, [
    `- 해결 방식은 ${solution}이며, MVP 범위는 고객이 가장 자주 겪는 문제를 빠르게 줄일 수 있는 기능부터 우선 구현한다.`,
    `- 핵심 기능은 ${coreTech}를 중심으로 구성하고, 기능 구현 후에는 ${customers}의 실제 사용 흐름에서 오류, 시간 절감, 만족도를 확인한다.`,
    `- 차별성은 기능 개수보다 고객 업무 흐름에 맞춘 적용성, 검증 가능한 산출물, 반복 사용 가능한 운영 절차를 확보하는 데 둔다.`,
  ]);

  enriched = enrichSection(enriched, "market", 420, [
    `- 목표시장은 ${industry} 중에서도 문제 인식이 높고 의사결정 구조가 단순한 ${customers}를 초기 진입 대상으로 설정한다.`,
    `- 초기 고객은 파일럿 협의가 가능하고 사용 전후 데이터를 확보할 수 있는 집단으로 좁히며, 시장 규모와 성장률은 외부 공신력 자료로 추가 검증 필요하다.`,
    `- 확장시장은 MVP 검증 결과가 확인된 이후 유사 업무 구조를 가진 인접 고객군으로 넓히고, 도입 절차와 가격 정책을 표준화한다.`,
  ]);

  enriched = enrichSection(enriched, "competitor", 420, [
    `- 경쟁 대안은 ${competitors}로 구분할 수 있으며, 현재 방식은 익숙하다는 장점은 있으나 문제 해결 결과를 추적하기 어렵다.`,
    `- ${itemName}은 ${customers}의 실제 업무 흐름에 맞춘 기능과 검증 리포트, 반복 적용 가능한 도입 절차를 제공하는 방향으로 차별화한다.`,
    `- 경쟁 검증은 가격, 사용 편의성, 문제 해결 시간, 산출물 품질을 기준으로 비교하고, 정량 수치는 파일럿 이후 추가 검증 필요 항목으로 관리한다.`,
  ]);

  enriched = enrichSection(enriched, "businessModel", 400, [
    `- 수익모델은 ${revenueModel}을 기본으로 하되, 초기에는 고객 부담을 낮춘 파일럿 또는 베타 요금제로 진입 장벽을 낮춘다.`,
    `- 과금 기준은 고객이 체감하는 산출물과 연결되어야 하며, MVP 검증 후에는 기능 범위, 사용량, 고객 규모에 따라 요금제를 세분화한다.`,
    `- 판매 채널은 직접 영업, 파트너 소개, 온라인 문의를 병행하고, 초기 성공 사례를 확보해 반복 판매 가능한 자료로 전환한다.`,
  ]);

  enriched = enrichSection(enriched, "scaleUp", 430, [
    `- 초기 진입은 ${customers} 중 협업 가능성이 높은 고객을 선정해 ${outputs}을 확보하는 방식으로 추진한다.`,
    `- 실증 단계에서는 ${currentStatus}를 바탕으로 MVP를 적용하고, 고객 사용 데이터와 인터뷰를 통해 개선 우선순위를 정한다.`,
    `- 확장 단계에서는 협력기관과 파트너십을 활용해 고객 접점을 넓히고, 검증된 기능을 패키지화해 유료 전환 가능성을 높인다.`,
  ]);

  enriched = enrichSection(enriched, "budget", 430, [
    `- ${expectedBudget}는 개발비, 실증비, 사업화비로 구분하고, 각 비용은 ${outputs}과 직접 연결되도록 산출근거를 작성한다.`,
    `- 개발비는 MVP 핵심 기능 구현과 사용성 개선에 우선 배분하고, 실증비는 고객 검증, 파일럿 운영, 결과 리포트 작성에 사용한다.`,
    `- 사업화비는 데모 자료, 랜딩 페이지, 초기 고객 확보 활동에 배분하며, 모든 수치는 견적과 실행계획으로 추가 검증 필요 항목을 관리한다.`,
  ]);

  enriched = enrichSection(enriched, "roadmap", 430, [
    `- 협약기간 내에는 요구사항 정리, MVP 개발, 파일럿 운영, 개선사항 반영, 결과 리포트 작성 순서로 추진한다.`,
    `- 1년차에는 초기 고객군을 확대하고 유료 베타 전환 가능성을 검증하며, 가격 정책과 고객 지원 절차를 정리한다.`,
    `- 2~3년차에는 인접 시장으로 확장하고 파트너 채널을 확보해 반복 판매 구조를 만들며, 핵심 지표는 추가 검증 필요 항목으로 관리한다.`,
  ]);

  enriched = enrichSection(enriched, "team", 400, [
    `- 팀 구성은 ${team}을 기반으로 하며, 대표자는 고객 문제 정의와 사업화 전략, 개발 담당자는 MVP 구현과 개선을 맡는다.`,
    `- 부족 역량은 외부 전문가, 협력기관, 파일럿 고객의 피드백으로 보완하고, 법무·회계·보안 등 전문 영역은 필요 시 자문 체계를 활용한다.`,
    `- 역할 분담은 산출물 기준으로 관리해 개발 결과, 고객 검증 자료, 사업화 자료가 일정 내 완성되도록 점검한다.`,
  ]);

  enriched = enrichSection(enriched, "partners", 380, [
    `- 협력기관은 파일럿 고객, 산업 전문가, 기술 자문, 판매 채널 파트너로 구분하고 목적에 따라 단계적으로 활용한다.`,
    `- 초기에는 고객 검증과 요구사항 확인을 위한 협력을 우선하고, MVP 개선 후에는 시장 진입과 레퍼런스 확보를 위한 협력으로 확장한다.`,
    `- 협력 시점은 기획, 실증, 사업화 단계로 나누어 관리하며, 협력 결과는 검증 리포트와 후속 영업 자료로 연결한다.`,
  ]);

  return enriched;
}
