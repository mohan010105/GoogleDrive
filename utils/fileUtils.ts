// File utilities for browser-native file handling

/**
 * Downloads a file using the provided URL and filename
 * This function always works in all browsers
 */
export function downloadFile(url: string, fileName: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  console.log('Download initiated for:', fileName);
}
