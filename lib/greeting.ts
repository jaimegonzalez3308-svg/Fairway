/** "Buenos días" until noon, "Buenas tardes" until 7 pm, then "Buenas noches",
 * by the device's own clock. */
export function greeting(now = new Date()) {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return "Buenos días";
  if (hour >= 12 && hour < 19) return "Buenas tardes";
  return "Buenas noches";
}
