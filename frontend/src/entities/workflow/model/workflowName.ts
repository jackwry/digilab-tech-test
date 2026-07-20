const SUFFIX_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/** A default name for a newly created workflow: `"Workflow ####"`, where
 * `####` is 4 random uppercase alphanumeric characters (JAC-13). */
export function generateDefaultWorkflowName(): string {
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += SUFFIX_CHARS[Math.floor(Math.random() * SUFFIX_CHARS.length)];
  }
  return `Workflow ${suffix}`;
}
