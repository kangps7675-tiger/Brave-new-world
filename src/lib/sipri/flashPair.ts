import { actorsOf } from "@/lib/news/eventScenarios";

/** 속보 글에서 읽히는 당사자 → SIPRI 나라 코드. 후티 같은 비국가 행위자는 일부러 뺀다(국가로 합치면 틀린다). */
const ISO_OF_ACTOR: Record<string, string> = { iran: "IRN", russia: "RUS", china: "CHN", dprk: "PRK" };

/** 무기를 넘겨주고 받는 이야기인지. 두 나라가 같이 나왔다고 곧바로 붙이지 않는다. */
const ARMS_WORDS =
  /\b(weapons?|arms|munitions?|missiles?|drones?|ammunition|shells?|shipments?|supplies|supplied|delivers?|delivered|transfers?)\b|무기|미사일|드론|포탄|탄약|공급|인도|이전|제공/i;

/** 속보가 무기 이전을 말하는 나라 쌍. 둘이 아니면 null. */
export function armsPairInFlash(text: string): [string, string] | null {
  if (!ARMS_WORDS.test(text)) return null;
  const isos = actorsOf(text)
    .map((id) => ISO_OF_ACTOR[id])
    .filter((x): x is string => Boolean(x));
  if (isos.length !== 2) return null;
  return [isos[0], isos[1]];
}
