from pathlib import Path
import json,statistics,math
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from PIL import Image
R=Path('/Users/liyufei/Desktop/COMP1110/COMP1110_final_li');A=R/'assets';s=json.loads((R/'analysis/summary.json').read_text());tr=json.loads((R/'analysis/traces.json').read_text());palette=['#597EAA','#74A8CF','#D17A44','#243F5B']
# Vector scientific figure with all plotted values sourced from saved replication traces.
def lineplot():
 c=canvas.Canvas(str(A/'backlog_traces.pdf'),pagesize=(640,300));x0,y0,w,h=60,48,550,215
 c.setFont('Helvetica',11);c.setStrokeColor(colors.HexColor('#ccd4de'))
 for y in range(0,5001,1000):
  yy=y0+h*y/5000;c.line(x0,yy,x0+w,yy);c.setFillColor(colors.HexColor('#243F5B'));c.drawRightString(x0-8,yy-3,str(y))
 for t in range(0,41,10):c.drawCentredString(x0+w*t/40,y0-15,str(t))
 c.drawCentredString(x0+w/2,12,'Simulation time (minutes)');c.saveState();c.translate(13,155);c.rotate(90);c.drawCentredString(0,0,'Not yet boarded (people)');c.restoreState()
 for i,d in enumerate(s['designs']):
  c.setStrokeColor(colors.HexColor(palette[i]));c.setLineWidth(1.8);p=c.beginPath()
  for j,t in enumerate(range(0,2401,5)):
   vals=[a['unboarded'] for a in tr if a['scenario']==d['id'] and a['t']==t];mean=statistics.mean(vals);xx=x0+w*t/2400;yy=y0+h*mean/5000
   if j:p.lineTo(xx,yy)
   else:p.moveTo(xx,yy)
  c.drawPath(p);c.setFillColor(colors.HexColor(palette[i]));c.setFont('Helvetica',11);c.drawString(60+i%2*280,285-i//2*13,d['label'])
 c.save()
def barplot():
 c=canvas.Canvas(str(A/'end_backlog.pdf'),pagesize=(640,290));x0,y0,w,h=58,55,552,205
 c.setFont('Helvetica',11)
 for y in range(0,5001,1000):
  yy=y0+h*y/5000;c.setStrokeColor(colors.HexColor('#dce3ea'));c.line(x0,yy,x0+w,yy);c.setFillColor(colors.HexColor('#243F5B'));c.drawRightString(x0-6,yy-3,str(y))
 for i,a in enumerate(s['summary']):
  m=a['unboarded']['mean'];ci=a['unboarded']['ci95HalfWidth'];x=x0+(i+.5)*w/4;c.setFillColor(colors.HexColor(palette[i]));c.rect(x-33,y0,66,h*m/5000,fill=1,stroke=0)
  c.setStrokeColor(colors.HexColor('#243F5B'));c.line(x,y0+h*(m-ci)/5000,x,y0+h*(m+ci)/5000);c.line(x-7,y0+h*(m+ci)/5000,x+7,y0+h*(m+ci)/5000)
  c.setFillColor(colors.HexColor('#243F5B'));c.drawCentredString(x,y0+h*(m+ci)/5000+9,f'{m:,.1f}');c.setFont('Helvetica',11);c.drawCentredString(x,35,a['label']);c.setFont('Helvetica',11)
 c.saveState();c.translate(13,155);c.rotate(90);c.drawCentredString(0,0,'Not boarded at 40 minutes (people)');c.restoreState();c.setFont('Helvetica',11);c.drawString(58,13,'Bars: mean of 30 independent runs. Error bars: 95% t intervals across runs.');c.save()
lineplot();barplot()
# Crop only the browser screenshot; no visual state or data is altered.
p=A/'website_full.png'
if p.exists():
 im=Image.open(p);print('screenshot',im.size);im.crop((0,0,im.width,min(im.height,1020))).save(A/'website_overview.png')
print('vector figures saved')
