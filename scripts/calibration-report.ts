import {
  BASELINE_PRICING_RULE as R,
  computePrice,
  deriveCogsPerManDay,
  type PriceInputFeature,
} from '@/lib/pricing';
const mk = (
  type: PriceInputFeature['type'],
  count: number,
  manDay: number,
  prefix: string,
): PriceInputFeature[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `${prefix}${i}`,
    name: `${prefix}${i}`,
    type,
    manDayMin: manDay,
    manDayMax: manDay,
  }));
const rp=(v:number)=>'Rp '+v.toLocaleString('id-ID');
const c=deriveCogsPerManDay(R);
console.log('COGS/man-day:',rp(c.cogsPerManDay),'| hari billable:',c.billableDaysPerMonth,'| beban bulanan:',rp(c.monthlyLoadedCost));
const A=computePrice({rule:R,features:[...mk('CORE',8,3,'c'),...mk('STANDARD',6,3,'s')],platform:'WEB',deployment:'OUR_CLOUD',userTier:'T10'});
console.log('\n== Skenario A (WMS Starter, 14 fitur) — acuan PRD: jual 56,8jt · 15md · GM 52% ==');
console.log(' subtotal fitur :',rp(A.featuresSubtotalMin));
console.log(' + setup tetap  :',rp(A.setupFee));
console.log(' harga jual     :',rp(A.totalMax),'(tampil',rp(A.displayTotalMax)+')');
console.log(' effort riil    :',A.internal.realEffortManDayMax,'man-day');
console.log(' COGS           :',rp(A.internal.cogsProjection));
console.log(' gross margin   :',(A.internal.grossMarginPct*100).toFixed(1)+'%');
console.log(' durasi         :',A.duration.weeksMin,'-',A.duration.weeksMax,'minggu');
const B=computePrice({rule:R,features:[...mk('CORE',8,3,'c'),...mk('STANDARD',12,3,'s'),...mk('CONFIGURABLE',5,4,'g')],customRequests:Array.from({length:3},(_,i)=>({id:'x'+i,name:'x'+i,isEstimated:true,manDayMin:6,manDayMax:6})),platform:'WEB',deployment:'OUR_CLOUD',userTier:'T50'});
console.log('\n== Skenario B (WMS Growth, 28 fitur) — acuan PRD: jual 215,1jt · 67md · GM 44% ==');
console.log(' subtotal fitur :',rp(B.featuresSubtotalMin));
console.log(' diskon skala   :',(B.discountPct*100)+'% =',rp(B.discountMin),`(${B.paidFeatureCount} fitur berbayar)`);
console.log(' + setup tetap  :',rp(B.setupFee));
console.log(' harga jual     :',rp(B.totalMax));
console.log(' effort riil    :',B.internal.realEffortManDayMax,'man-day');
console.log(' COGS           :',rp(B.internal.cogsProjection));
console.log(' gross margin   :',(B.internal.grossMarginPct*100).toFixed(1)+'%');
console.log(' porsi custom   :',(B.customSharePct*100).toFixed(1)+'%');
console.log(' durasi         :',B.duration.weeksMin,'-',B.duration.weeksMax,'minggu');
console.log('\n>> Temuan PRD terjaga: margin B ('+(B.internal.grossMarginPct*100).toFixed(1)+'%) < margin A ('+(A.internal.grossMarginPct*100).toFixed(1)+'%) meski nilai B '+(B.totalMax/A.totalMax).toFixed(1)+'× lebih besar.');
