// Рабочие дни — Пн–Пт. Без учёта праздников РБ: для MVP избыточно, но в реальной
// эксплуатации стоит добавить таблицу `holidays` и фильтровать по ней.
// Расчёт целочисленный: сравнение по началу дня (UTC), чтобы не зависеть от часа.

const MS_DAY = 24 * 60 * 60 * 1000;

function startOfUtcDay(date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function isWeekend(date) {
  const dow = date.getUTCDay();
  return dow === 0 || dow === 6;
}

/**
 * Сколько РАБОЧИХ дней прошло с `from` по `to` (включая частичный текущий день
 * только если он рабочий). Если to < from — возвращает 0.
 * Примеры (Пт→Пн = 1 раб.день; Пн→Пт = 4 раб.дня).
 */
export function businessDaysBetween(from, to) {
  const a = startOfUtcDay(from);
  const b = startOfUtcDay(to);
  if (b <= a) return 0;
  let count = 0;
  const cursor = new Date(a);
  cursor.setUTCDate(cursor.getUTCDate() + 1); // не считаем сам день старта
  while (cursor <= b) {
    if (!isWeekend(cursor)) count += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}

/** Возвращает массив рабочих дней между двумя датами (для тестов/дебага). */
export function listBusinessDays(from, to) {
  const out = [];
  const cursor = startOfUtcDay(from);
  const end = startOfUtcDay(to);
  cursor.setUTCDate(cursor.getUTCDate() + 1);
  while (cursor <= end) {
    if (!isWeekend(cursor)) out.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

export { MS_DAY };
