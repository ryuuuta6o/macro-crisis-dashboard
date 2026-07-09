export function ReferenceDisclosure({
  id,
  title,
  subtitle,
  status,
  children,
}: {
  id?: string;
  title: string;
  subtitle: string;
  status: string;
  children: React.ReactNode;
}) {
  return (
    <details id={id} className="reference-disclosure scroll-mt-16">
      <summary>
        <span><small>{subtitle}</small><strong>{title}</strong></span>
        <span className="reference-disclosure-status"><i />{status}</span>
        <b aria-hidden="true">⌄</b>
      </summary>
      <div className="reference-disclosure-content">{children}</div>
    </details>
  );
}
