import { useMarketData } from "@/lib/market-data-store";
import { DataStatusBadge } from "./data-status";
import { FEAR_GREED_ZONES, fearGreedColor } from "@/lib/fear-greed";
export function FearGreedGauge() {
  const { fearGreed, loading, error, lastUpdate, status } = useMarketData();
  const VALUE=fearGreed?.value, LABEL=fearGreed?.label;
  const dataStatus=loading&&!fearGreed?"loading":!fearGreed?"unavailable":status==="stale"||error?"stale":"ok";
  const angle=VALUE==null?0:(VALUE/100)*180, rad=((180-angle)*Math.PI)/180, cx=110,cy=110,r=88;
  const nx=cx+r*Math.cos(rad), ny=cy-r*Math.sin(rad), zoneColor=fearGreedColor(VALUE);
  return <div data-tour="fear-greed" className="rounded-xl border border-border bg-card p-4 h-full flex flex-col">
    <div className="flex items-baseline justify-between"><h3 className="text-[15px] font-medium text-foreground">Fear &amp; Greed Index</h3><DataStatusBadge source="Alternative.me · 7 dias" updatedAt={lastUpdate} status={dataStatus}/></div>
    <div className="relative flex-1 flex items-center justify-center mt-2"><svg viewBox="0 0 220 130" className="w-full max-w-[260px]">
      {FEAR_GREED_ZONES.map(z=>{const start=((100-z.to)/100)*180,end=((100-z.from)/100)*180;return <ArcSegment key={z.label} cx={cx} cy={cy} r={r} startAngle={start} endAngle={end} color={z.color}/>})}
      {VALUE!=null&&<><line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#E6F1FB" strokeWidth="2.5" strokeLinecap="round"/><circle cx={cx} cy={cy} r="6" fill="#0A0B0E" stroke="#E6F1FB" strokeWidth="2"/></>}
    </svg><div className="absolute bottom-2 flex flex-col items-center"><div className="text-[32px] font-semibold leading-none" style={{color:zoneColor}}>{VALUE??"Indisponível"}</div><div className="text-[12px] text-muted-foreground mt-0.5">{LABEL??"Indisponível"}</div></div></div>
    <div className="mt-3 rounded-lg border border-border bg-secondary/30 p-3 text-[11px] text-muted-foreground">Fonte real Alternative.me; janela de 7 dias.</div>
  </div>;
}
function ArcSegment({cx,cy,r,startAngle,endAngle,color}:{cx:number;cy:number;r:number;startAngle:number;endAngle:number;color:string}){const start=polar(cx,cy,r,startAngle),end=polar(cx,cy,r,endAngle),large=endAngle-startAngle>180?1:0,d=`M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;return <path d={d} stroke={color} strokeWidth="14" fill="none" strokeLinecap="butt" opacity=".85"/>}
function polar(cx:number,cy:number,r:number,angleDeg:number){const rad=((angleDeg-180)*Math.PI)/180;return{x:cx+r*Math.cos(rad),y:cy+r*Math.sin(rad)}}
