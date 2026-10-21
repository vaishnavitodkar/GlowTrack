/** Calendar date on the device, formatted without converting through UTC. */
export function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Calendar date in India Standard Time, independent of the device timezone. */
export function getIndiaDateKey(date = new Date()): string {
  const indiaDate = new Date(date.getTime() + 330 * 60 * 1000);
  const year = indiaDate.getUTCFullYear();
  const month = String(indiaDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(indiaDate.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
