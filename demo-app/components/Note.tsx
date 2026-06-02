export function Note({ content }: { content: string }) {
  // VULN: renders unsanitized HTML
  return <div dangerouslySetInnerHTML={{ __html: content }} />;
}
