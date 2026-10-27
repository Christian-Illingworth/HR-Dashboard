/** FR-029 and constitution Principle VII: every view says clearly when it shows mock data. */
export function MockDataNotice() {
  return (
    <div className="notice tone-amber" role="note">
      <strong>Mock data.</strong>&nbsp;These are sample figures about made-up people, not real employee
      records.
    </div>
  );
}
