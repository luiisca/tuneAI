export function formatSongDuration(duration: number) {
  const rest = Math.floor(duration % 60);
  return `${Math.floor(duration / 60)}:${rest < 10 ? `0${rest}` : rest}`;
}

export function convertToSeconds(duration: number, percentage: number) {
  return duration * percentage;
}
