/** Per-extension file-type icons (IconScout, free/commercial-use) — shared by
 *  every place a downloadable file gets a small type icon (chat message file
 *  cards, the Files panel) so they never drift out of sync with each other. */
const FILE_ICON_SRC: Record<string, string> = {
  DOC: '/icons/files/docx.svg',
  DOCX: '/icons/files/docx.svg',
  PDF: '/icons/files/pdf.svg',
};

export function fileExtension(displayName: string): string {
  return displayName.split('.').pop()?.toUpperCase() || 'DOC';
}

export function getFileIconSrc(displayName: string): string {
  return FILE_ICON_SRC[fileExtension(displayName)] || '/icons/files/generic.svg';
}
