"use client";

import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { useSafeNavigate } from "@/components/providers/SafeActions";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
import { MapPinOff } from "lucide-react";
import { locateRegion, spreadPins } from "@/lib/geo";
import { STATUS_LABEL } from "@/lib/labels";
import { fmtShortDate, fmtTime } from "@/lib/time";
import type { LeadStatus } from "@/lib/types";

export interface MapLead {
  id: string;
  company_name: string;
  region: string;
  status: LeadStatus;
  needs_report: boolean;
  meeting_at: Date | string;
  assignee_name: string | null;
}

type PinKind = "needs" | "open" | "assigned" | "follow" | "draft" | "done";

const PIN: Record<PinKind, { label: string; color: string }> = {
  needs: { label: "결과 미입력", color: "var(--semantic-danger)" },
  open: { label: "신청 가능", color: "var(--semantic-warning)" },
  assigned: { label: "배정 완료", color: "var(--semantic-success)" },
  follow: { label: "후속 진행", color: "var(--semantic-purple)" },
  draft: { label: "공개 대기", color: "#64748b" },
  done: { label: "종료·취소", color: "#a3acb8" },
};

function kindOf(l: MapLead): PinKind {
  if (l.needs_report) return "needs";
  if (l.status === "OPEN") return "open";
  if (l.status === "ASSIGNED") return "assigned";
  if (l.status === "FOLLOW_UP") return "follow";
  if (l.status === "DRAFT") return "draft";
  return "done";
}

const CAPITAL_AREA: [number, number] = [37.46, 126.98];

export function LeadMap({ leads }: { leads: MapLead[] }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const layer = useRef<LayerGroup | null>(null);
  const navigate = useSafeNavigate();

  const { located, outside } = useMemo(() => {
    const raw: { id: string; lead: MapLead; lat: number; lng: number; kind: PinKind }[] = [];
    const outside: MapLead[] = [];
    for (const lead of leads) {
      const loc = locateRegion(lead.region);
      if (!loc) { outside.push(lead); continue; }
      raw.push({ id: lead.id, lead, lat: loc.lat, lng: loc.lng, kind: kindOf(lead) });
    }
    return { located: spreadPins(raw), outside };
  }, [leads]);

  const counts = useMemo(() => {
    const c: Partial<Record<PinKind, number>> = {};
    for (const p of located) c[p.kind] = (c[p.kind] ?? 0) + 1;
    return c;
  }, [located]);

  // Create the map once.
  useEffect(() => {
    let disposed = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (disposed || !el.current || map.current) return;
      const m = L.map(el.current, { center: CAPITAL_AREA, zoom: 9, scrollWheelZoom: false, zoomControl: true, attributionControl: true });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        subdomains: "abcd",
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      }).addTo(m);
      m.on("focus", () => m.scrollWheelZoom.enable());
      m.on("blur", () => m.scrollWheelZoom.disable());
      map.current = m;
      layer.current = L.layerGroup().addTo(m);
      drawPins(L);
    })();
    return () => {
      disposed = true;
      map.current?.remove();
      map.current = null;
      layer.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redraw pins whenever the list changes (tab / search).
  useEffect(() => {
    if (!map.current) return;
    import("leaflet").then(({ default: L }) => drawPins(L));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [located]);

  function drawPins(L: typeof import("leaflet")) {
    const m = map.current;
    const g = layer.current;
    if (!m || !g) return;
    g.clearLayers();
    located.forEach((p, i) => {
      const icon = L.divIcon({
        className: "lf-pin-wrap",
        html: `<span class="lf-pin" style="--pin:${PIN[p.kind].color};--d:${Math.min(i, 12) * 30}ms"></span>`,
        iconSize: [28, 36],
        iconAnchor: [14, 34],
        popupAnchor: [0, -30],
      });
      const marker = L.marker([p.lat, p.lng], { icon, title: p.lead.company_name, riseOnHover: true });
      marker.bindPopup(() => popupContent(p.lead, PIN[p.kind].label, (href) => navigate(href)), { closeButton: true, minWidth: 200 });
      g.addLayer(marker);
    });
    if (located.length) {
      m.fitBounds(L.latLngBounds(located.map((p) => [p.lat, p.lng] as [number, number])), { padding: [36, 36], maxZoom: 12 });
    } else {
      m.setView(CAPITAL_AREA, 9);
    }
  }

  return (
    <div className="grid gap-3" data-testid="lead-map">
      <div className="flex flex-wrap gap-1.5" aria-label="지도 범례">
        {(Object.keys(PIN) as PinKind[]).filter((k) => counts[k]).map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1 text-[14px] font-semibold text-ink-2">
            <span className="h-3 w-3 rounded-full" style={{ background: PIN[k].color }} />
            {PIN[k].label} {counts[k]}
          </span>
        ))}
        <span className="inline-flex items-center px-1 text-[13.5px] text-ink-3">위치는 시·군·구 기준의 대략적인 위치입니다</span>
      </div>
      <div className="isolate overflow-hidden rounded-2xl border border-line bg-white shadow-card">
        <div ref={el} className="h-[58vh] min-h-[360px] w-full lg:h-[600px]" data-testid="lead-map-canvas" role="region" aria-label="미팅 위치 지도" />
      </div>
      {outside.length > 0 && (
        <div className="rounded-2xl border border-dashed border-line bg-white px-4 py-3" data-testid="map-outside">
          <div className="mb-1.5 flex items-center gap-1.5 text-[15px] font-semibold text-ink-2"><MapPinOff size={16} /> 수도권 밖 {outside.length}건</div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {outside.map((l) => (
              <Link prefetch={false} key={l.id} href={`/leads/${l.id}`} className="text-[15px] font-medium text-primary hover:underline">
                {l.company_name} <span className="text-ink-3">({l.region})</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Popup built from DOM nodes (textContent) so company names can't inject HTML. */
function popupContent(lead: MapLead, statusLabel: string, go: (href: string) => void): HTMLElement {
  const root = document.createElement("div");
  root.className = "lf-popup";
  const title = document.createElement("div");
  title.className = "lf-popup-title";
  title.textContent = lead.company_name;
  const status = document.createElement("div");
  status.className = "lf-popup-status";
  status.textContent = lead.needs_report ? statusLabel : STATUS_LABEL[lead.status];
  const meta = document.createElement("div");
  meta.className = "lf-popup-meta";
  meta.textContent = `${fmtShortDate(lead.meeting_at)} ${fmtTime(lead.meeting_at)} · ${lead.region}${lead.assignee_name ? ` · ${lead.assignee_name}` : ""}`;
  const link = document.createElement("a");
  link.className = "lf-popup-link";
  link.href = `/leads/${lead.id}`;
  link.textContent = "상세 보기 →";
  link.addEventListener("click", (e) => { e.preventDefault(); go(`/leads/${lead.id}`); });
  root.append(title, status, meta, link);
  return root;
}
