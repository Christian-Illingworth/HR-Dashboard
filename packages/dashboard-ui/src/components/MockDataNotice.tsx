/** FR-029 and constitution Principle VII: every view says clearly when it shows mock data. */
export function MockDataNotice() {
  return (
    <div className="notice tone-amber" role="note">
      {/* One child, so the kit's flex notice keeps the label and the sentence on one line. */}
      <span>
        <strong>Mock data.</strong> These are sample figures about made-up people, not real employee records.
      </span>
    </div>
  );
}
