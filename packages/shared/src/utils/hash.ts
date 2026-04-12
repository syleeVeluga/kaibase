export async function sha256(content: string | ArrayBuffer): Promise<string> {
  const data =
    typeof content === 'string'
      ? new TextEncoder().encode(content)
      : content;
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
