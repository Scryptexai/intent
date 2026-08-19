import { TrackRecordClient } from "@/components/shell/track-record-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Track Record · INTENT",
  description: "Public prediction track record: closed backtests with as-of vs event dates, plus the live calibration framework.",
};

export default function TrackRecordPage() {
  return <TrackRecordClient />;
}
