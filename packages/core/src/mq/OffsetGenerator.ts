/**
 * OffsetGenerator - Generates monotonically increasing offsets
 *
 * Format: "{timestamp_base36}-{sequence_padded}"
 * Example: "lq5x4g2-0001"
 *
 * This format ensures:
 * - Lexicographic ordering matches temporal ordering
 * - Multiple events in same millisecond get unique offsets
 * - Human-readable and compact
 */
export class OffsetGenerator {
  private lastTimestamp = 0;
  private sequence = 0;

  /**
   * Generate a new offset
   */
  generate(): string {
    const now = Date.now();

    if (now === this.lastTimestamp) {
      this.sequence++;
    } else {
      this.lastTimestamp = now;
      this.sequence = 0;
    }

    const timestampPart = now.toString(36);
    const sequencePart = this.sequence.toString().padStart(4, "0");

    return `${timestampPart}-${sequencePart}`;
  }

  /**
   * Compare two offsets
   * @returns negative if a < b, 0 if a == b, positive if a > b
   */
  static compare(a: string, b: string): number {
    const [aTime, aSeq] = a.split("-");
    const [bTime, bSeq] = b.split("-");

    const timeDiff = parseInt(aTime, 36) - parseInt(bTime, 36);
    if (timeDiff !== 0) return timeDiff;

    return parseInt(aSeq) - parseInt(bSeq);
  }
}
