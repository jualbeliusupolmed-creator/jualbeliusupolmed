"use client";

import BroadcastPanel from "../BroadcastPanel";

export default function BroadcastClient({ sellers = [] }) {
  return <BroadcastPanel sellers={sellers} />;
}
