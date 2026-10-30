export type DocumentSlot = "identity" | "identityBack" | "addressProof";
export function SampleDocumentCard({
  name,
  title,
  description,
  attached,
  hasError,
  onToggle,
}: {
  name: DocumentSlot;
  title: string;
  description: string;
  attached: boolean;
  hasError: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={"upload-card " + (attached ? "uploaded" : "")} key={name}>
      <div className="upload-icon" key={String(attached)} aria-hidden="true">
        {attached ? "✓" : "↑"}
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      <div className="document-status" role="status">
        {attached ? (
          <div className="document-file">
            ▤ sample-{name}.pdf <span>SAMPLE ATTACHED</span>
          </div>
        ) : (
          <span className="document-empty">Ready for a sample document</span>
        )}
      </div>
      <button
        type="button"
        name={name}
        className={"button " + (attached ? "document-remove" : "secondary")}
        aria-label={(attached ? "Remove sample: " : "Add sample: ") + title}
        onClick={onToggle}
      >
        {attached ? "Remove sample" : "Add sample document +"}
      </button>
      {hasError && (
        <span className="field-error" role="alert">
          Add a sample document to continue.
        </span>
      )}
    </div>
  );
}
