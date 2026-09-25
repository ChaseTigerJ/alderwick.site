"""Original Alderwick harbor. Deterministic Blender source, no external assets.
Run Blender --background --python assets-source/create_island.py
Source Z up, front -Y. Export Y up, front +Z.
"""
import bpy, math, random, os
from mathutils import Vector
from collections import defaultdict
random.seed(41)
bpy.context.preferences.filepaths.save_version=0
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
M={}
def material(name,h,emit=0):
 rgb=tuple(int(h[i:i+2],16)/255 for i in (0,2,4));c=tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb);m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*c,1);bs.inputs['Roughness'].default_value=.86
 if emit:bs.inputs['Emission Color'].default_value=(*c,1);bs.inputs['Emission Strength'].default_value=emit
 M[name]=m;return m
for n,h in {'grass_ground':'788B57','grass_tufts':'8C9F67','sand':'C6B68B','cliff':'8D7560','cliff_light':'A8957C','cliff_dark':'75665C','wood':'574536','wood_light':'9E7D52','plaster':'E7D6AE','plaster_alt':'C8B88E','roof':'B66147','roof_light':'C77852','roof_green':'344F47','roof_green_light':'4C6A57','stone':'9C9A88','leaf_gold':'C9903D','leaf_orange':'B76C36','leaf_light':'D8AB55','leaf_green':'728148','leaf_pine':'365B48','leaf_pine_light':'50735A','canvas':'F3E1B7','iron':'424A40','berry':'954D46','pumpkin':'D38138','dog':'B69665','pink':'D394AC'}.items():material(n,h)
material('window_glow','FFE2A0',.3)
def mesh(n,v,f,m):
 me=bpy.data.meshes.new(n);me.from_pydata(v,[],f);me.update();o=bpy.data.objects.new(n,me);bpy.context.collection.objects.link(o);o.data.materials.append(M[m]);return o
def cube(n,p,s,m,bevel=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.name=n;o.dimensions=s;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(M[m])
 if bevel:
  mod=o.modifiers.new('Soft handmade edges','BEVEL');mod.width=bevel;mod.segments=1;bpy.ops.object.modifier_apply(modifier=mod.name)
 return o
def beam(n,a,b,r,m,sides=6):
 a,b=Vector(a),Vector(b);d=b-a;bpy.ops.mesh.primitive_cylinder_add(vertices=sides,radius=r,depth=d.length,location=(a+b)/2);o=bpy.context.object;o.name=n;o.rotation_euler=d.to_track_quat('Z','Y').to_euler();o.data.materials.append(M[m]);return o
def cone(n,p,r1,r2,d,m,sides=8):
 bpy.ops.mesh.primitive_cone_add(vertices=sides,radius1=r1,radius2=r2,depth=d,location=p);o=bpy.context.object;o.name=n;o.data.materials.append(M[m]);return o
def ico(n,p,s,m,sub=1):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub,radius=1,location=p);o=bpy.context.object;o.name=n;o.scale=s;o.data.materials.append(M[m]);return o
def transform(objs,x,y,z=0,rot=0):
 for o in objs:
  p=o.location.copy();o.location=(x+p.x*math.cos(rot)-p.y*math.sin(rot),y+p.x*math.sin(rot)+p.y*math.cos(rot),p.z+z);o.rotation_euler.z+=rot
N=52
boundary=[]
for i in range(N):
 a=i*math.tau/N;wave=1+.032*math.sin(5*a)+.033*math.cos(9*a);boundary.append((5.7*math.cos(a)*wave,4.15*math.sin(a)*wave))
mesh('Meadow',[(0,0,0)]+[(x,y,0) for x,y in boundary],[(0,1+i,1+(i+1)%N) for i in range(N)],'grass_ground')
v=[]
for fac,z in [(1,0),(.99,-.18),(1.035,-.58),(.94,-1.05),(.82,-1.22)]:v.extend([(x*fac,y*fac,z+(random.uniform(-.04,.04) if z else 0)) for x,y in boundary])
f=[]
for band in range(4):
 for i in range(N):
  a=band*N+i;b=band*N+(i+1)%N;c=(band+1)*N+(i+1)%N;d=(band+1)*N+i;f.extend([(a,b,c),(a,c,d)])
f.append(tuple(range(4*N,5*N)));o=mesh('Layered island cliffs',v,f,'cliff')
for m in ['cliff_light','cliff_dark','sand']:o.data.materials.append(M[m])
for i,p in enumerate(o.data.polygons):p.material_index=3 if i<N*2 else random.choices([0,1,2],[5,3,2])[0]
path_layer=0
def path(n,points,width):
 global path_layer
 path_layer+=1
 elevation=.018+path_layer*.003
 v=[]
 for i,p in enumerate(points):
  a=Vector(points[max(i-1,0)]);b=Vector(points[min(i+1,len(points)-1)]);d=(b-a).normalized();nn=Vector((-d.y,d.x));v.extend([(p[0]+nn.x*width/2,p[1]+nn.y*width/2,elevation),(p[0]-nn.x*width/2,p[1]-nn.y*width/2,elevation)])
 mesh(n,v,[(i*2,i*2+1,i*2+3,i*2+2) for i in range(len(points)-1)],'sand')
path('Harbor lane',[(.65,-4),(.45,-3),(-.1,-2.1),(-.3,-1.1),(.3,-.1),(.4,1.2),(.3,2.2)],.63)
path('Village lane',[(-4,-.5),(-2.8,-.7),(-1.6,-1.15),(-.3,-1.1),(1.3,-1.1),(2.8,-.6),(3.7,.3)],.53)
path('Garden lane',[(-2.8,-.7),(-3,-1.6),(-3.3,-2.2)],.4)
def window(x,y,z,w=.32,h=.39,side=False):
 if not side:
  cube('Window oak frame',(x,y,z),(w+.085,.055,h+.085),'wood');cube('Warm windowpane',(x,y-.035,z),(w,.035,h),'window_glow');cube('Window mullion',(x,y-.06,z),(.035,.025,h),'wood');cube('Window transom',(x,y-.06,z+.015),(w,.025,.035),'wood');cube('Deep window sill',(x,y-.095,z-h/2-.02),(w+.13,.18,.05),'wood_light')
 else:
  cube('Side window frame',(x,y,z),(.055,w+.085,h+.085),'wood');cube('Side warm windowpane',(x+.035,y,z),(.035,w,h),'window_glow');cube('Side window mullion',(x+.06,y,z),(.025,.035,h),'wood');cube('Side window transom',(x+.06,y,z+.015),(.025,w,.035),'wood');cube('Side window sill',(x+.095,y,z-h/2-.02),(.18,w+.13,.05),'wood_light')
def cottage(name,x,y,w=1.7,d=1.8,h=1.25,rot=0,green=False,hall=False):
 start=set(bpy.data.objects);roof='roof_green' if green else 'roof';line='roof_green_light' if green else 'roof_light'
 cube('Stone foundation',(0,0,.08),(w+.15,d+.14,.18),'stone',.025);cube('Limewashed walls',(0,0,.17+h/2),(w,d,h),'plaster' if not green else 'plaster_alt');rz=.17+h;apex=rz+w*.59
 mesh('Plaster gables',[(-w/2,-d/2,rz),(w/2,-d/2,rz),(0,-d/2,apex),(-w/2,d/2,rz),(w/2,d/2,rz),(0,d/2,apex)],[(0,1,2),(5,4,3)],'plaster');e=w/2+.16;dep=d/2+.17
 for side in [-1,1]:
  mesh('Steep roof',[(side*e,-dep,rz-.03),(side*e,dep,rz-.03),(0,dep,apex+.085),(0,-dep,apex+.085),(side*e,-dep,rz-.12),(side*e,dep,rz-.12),(0,dep,apex),(0,-dep,apex)],[(0,1,2,3),(4,7,6,5),(0,4,5,1),(3,2,6,7),(0,3,7,4),(1,5,6,2)],roof)
  for f in [.25,.5,.75]:
   zz=(rz-.03)*(1-f)+(apex+.085)*f;beam('Shingle courses',(side*e*(1-f),-dep,zz+.012),(side*e*(1-f),dep,zz+.012),.014,line,4)
  for yy in [-dep+.28,0,dep-.3]:beam('Roof seams',(side*e,yy,rz-.02),(0,yy,apex+.095),.01,line,4)
 beam('Ridge cap',(0,-dep-.025,apex+.09),(0,dep+.025,apex+.09),.047,line)
 for xx in [-w/2+.025,w/2-.025]:cube('Corner timber',(xx,-d/2-.012,.16+h/2),(.078,.077,h+.06),'wood_light')
 for zz in [.21,rz-.05]:cube('Front timber',(0,-d/2-.025,zz),(w+.025,.065,.07),'wood_light');cube('Side timber',(w/2+.025,0,zz),(.065,d,.065),'wood_light')
 for f in [.27,.52,.76]:cube('Clapboard front',(0,-d/2-.012,.18+h*f),(w,.032,.026),'plaster_alt');cube('Clapboard side',(w/2+.013,0,.18+h*f),(.032,d,.026),'plaster_alt')
 for side in [-1,1]:beam('Gable timber',(side*w/2,-d/2-.04,rz),(0,-d/2-.04,apex),.035,'wood_light',4)
 beam('Gable kingpost',(0,-d/2-.035,rz),(0,-d/2-.035,apex-.07),.035,'wood_light',4)
 cube('Door surround',(0,-d/2-.045,.55),(.42,.09,.82),'wood');cube('Forest door',(0,-d/2-.1,.55),(.32,.04,.71),'roof_green')
 for dx in [-.09,0,.09]:cube('Door boards',(dx,-d/2-.126,.55),(.014,.008,.66),'roof_green_light')
 ico('Brass knob',(.11,-d/2-.15,.53),(.035,.022,.035),'leaf_light');cube('Front step',(0,-d/2-.23,.085),(.59,.36,.14),'stone',.015)
 window(-w*.32,-d/2-.055,.78,w=.3 if w<2 else .4);window(w*.32,-d/2-.055,.78,w=.3 if w<2 else .4);window(w/2+.052,-d*.26,.83,side=True);window(w/2+.052,d*.26,.83,side=True)
 for xx in [-w*.32,w*.32]:
  cube('Herb box',(xx,-d/2-.17,.48),(.41,.17,.11),'wood_light')
  for dd in [-.12,0,.12]:ico('Window herbs',(xx+dd,-d/2-.17,.59),(.1,.09,.09),'leaf_green')
 cube('Chimney',(-w*.25,d*.24,apex-.04),(.26,.3,.8),'plaster_alt',.025);cube('Chimney cap',(-w*.25,d*.24,apex+.37),(.34,.37,.095),'stone');cube('Chimney soot',(-w*.25,d*.24,apex+.42),(.18,.2,.005),'iron')
 if hall:
  tz=apex+.08;cube('Cupola base',(0,.3,tz+.11),(.59,.57,.18),'plaster')
  for xx in [-.23,.23]:
   for yy in [.08,.52]:cube('Cupola post',(xx,yy,tz+.46),(.065,.065,.62),'wood_light')
  cone('Bronze bell',(0,.3,tz+.43),.15,.06,.24,'leaf_gold');cone('Cupola roof',(0,.3,tz+.86),.49,0,.5,'roof_green',4).rotation_euler.z=math.pi/4;beam('Weathervane',(0,.3,tz+1.08),(0,.3,tz+1.42),.018,'iron');beam('Vane arrow',(-.21,.3,tz+1.33),(.23,.3,tz+1.33),.018,'iron')
  cube('Tavern sign bracket',(w/2+.22,-d/2-.16,1.1),(.45,.075,.065),'wood');cube('Tavern sign',(w/2+.34,-d/2-.16,.87),(.25,.07,.26),'roof_green',.02);ico('Sign golden leaf',(w/2+.34,-d/2-.21,.87),(.07,.02,.09),'leaf_gold')
 objs=set(bpy.data.objects)-start;transform(objs,x,y,rot=rot)
 for ob in objs:ob.name=name+' | '+ob.name
cottage('Alder and Anchor',.65,1.18,2.05,2.05,1.52,-.06,hall=True)
cottage('Fisher cottage',-2.4,.65,1.55,1.62,1.14,.17,green=True)
cottage('Harbor workshop',2.9,.85,1.42,1.6,1.07,-.25)
cottage('Clifftop cottage',-3.45,2.18,1.25,1.35,.94,.25)
wx,wy=.9,-1.23
cone('Well stone curb',(wx,wy,.2),.36,.36,.4,'stone',12);cone('Dark well water',(wx,wy,.41),.28,.28,.006,'roof_green',12)
for xx in [wx-.35,wx+.35]:cube('Well upright',(xx,wy,.58),(.07,.08,1.15),'wood_light')
beam('Well axle',(wx-.43,wy,.9),(wx+.43,wy,.9),.065,'wood',8);beam('Well rope',(wx,wy,.89),(wx,wy,.43),.015,'canvas',5)
mesh('Well roof',[(wx-.58,wy-.43,1.13),(wx+.58,wy-.43,1.13),(wx+.58,wy,1.47),(wx-.58,wy,1.47),(wx-.58,wy+.43,1.13),(wx+.58,wy+.43,1.13)],[(0,1,2,3),(3,2,5,4)],'roof_green')
def tree(x,y,s=1,k='leaf_gold'):
 z=1.45*s;beam('Alder trunk',(x,y,0),(x+.07*s,y,z),.12*s,'wood_light')
 for dx,dy in [(-.36,0),(.3,.19),(.12,-.32)]:beam('Alder bough',(x,y,.72*s),(x+dx*s,y+dy*s,z+.2*s),.055*s,'wood_light',5)
 for dx,dy,dz,ss in [(-.31,0,.02,.68),(.36,.1,.17,.65),(.04,-.29,.19,.69),(.05,.13,.61,.64)]:
  o=ico('Alder crown',(x+dx*s,y+dy*s,z+dz*s),(ss*s,ss*s*.88,ss*s*.96),k,2);o.rotation_euler=(random.random()*.4,random.random()*.4,random.random()*math.tau)
 ico('Alder crown tip',(x-.13*s,y+.15*s,z+.74*s),(.38*s,.36*s,.35*s),'leaf_light' if k=='leaf_gold' else k)
def pine(x,y,s=1):
 beam('Pine trunk',(x,y,0),(x,y,2.1*s),.1*s,'wood_light')
 for i,(z,r) in enumerate([(1.02,.74),(1.53,.6),(1.97,.44)]):cone('Evergreen canopy',(x,y,z*s),r*s,0,1.25*s,'leaf_pine' if i%2==0 else 'leaf_pine_light',7).rotation_euler.z=i*.5
for x,y,s,k in [(-4.4,.75,1.15,'leaf_orange'),(-4.7,-.5,1.03,'leaf_gold'),(-4.6,1.8,.95,'leaf_gold'),(-2.5,2.9,1.07,'leaf_gold'),(-1,3.02,1.2,'leaf_orange'),(1.8,3,1.05,'leaf_green'),(3.2,2.43,1.2,'leaf_gold'),(4.28,1.43,1.08,'leaf_orange'),(4.7,-.18,1.02,'leaf_gold'),(3.67,-1.3,.78,'leaf_green'),(-4,-2,.74,'leaf_orange'),(-1.8,-2.9,.77,'leaf_gold')]:tree(x,y,s,k)
for x,y,s in [(-3.45,3.15,1.18),(-.07,3.53,.95),(2.5,3.05,1.17),(4.64,.9,.84),(-5,.22,.8)]:pine(x,y,s)
for i in range(34):
 a=random.uniform(0,math.tau);x=math.cos(a)*random.uniform(4.6,5.48);y=math.sin(a)*random.uniform(3,3.98);ico('Shore granite',(x,y,-.05),(random.uniform(.12,.36),random.uniform(.13,.3),random.uniform(.1,.24)),'stone')
for i in range(38):
 x=random.uniform(-4.9,4.9);y=random.uniform(-3.5,3.5)
 if (x/5.7)**2+(y/4.1)**2<.8 and abs(y+.8)>.5 and abs(x)>.6:
  for j in range(3):cone('Grass tuft',(x+j*.05,y,.075),.024,0,.15,'grass_tufts',3)
def fence(a,b,posts=5):
 a,b=Vector((*a,0)),Vector((*b,0))
 for i in range(posts):
  p=a.lerp(b,i/(posts-1));cube('Fence upright',(p.x,p.y,.32),(.075,.075,.63),'wood_light',.012)
 for z in [.24,.47]:beam('Split rail',(a.x,a.y,z),(b.x,b.y,z),.037,'wood_light',4)
fence((-3.9,-2.55),(-2.55,-2.7));fence((-3.9,-2.55),(-3.97,-1.45),4);cube('Garden earth',(-3.14,-1.8,.025),(1.22,.98,.04),'cliff')
for row in range(3):
 for col in range(5):
  x=-3.63+col*.24;y=-2.12+row*.28;ico('Cabbages',(x,y,.105),(.1,.1,.09),'leaf_green')
  if row==0 and col%2==0:ico('Pumpkin',(x,y,.16),(.11,.1,.1),'pumpkin',2);beam('Pumpkin stalk',(x,y,.23),(x+.02,y,.29),.012,'wood')
def barrel(x,y,z=0,s=1):
 cone('Oak barrel',(x,y,z+.2*s),.18*s,.17*s,.4*s,'wood_light',10)
 for zz in [.09,.3]:cone('Barrel hoop',(x,y,z+zz*s),.186*s,.186*s,.037*s,'iron',10)
def crate(x,y,z=0,s=.4):
 cube('Supply crate',(x,y,z+s/2),(s,s,s),'wood_light',.012)
 for zz in [z+.05,z+s-.05]:cube('Crate crossbar',(x,y-s/2-.013,zz),(s+.015,.028,.053),'wood')
 beam('Crate diagonal',(x-s*.4,y-s/2-.031,z+.06),(x+s*.4,y-s/2-.031,z+s-.06),.028,'wood',4)
barrel(2.12,-.24,s=.87);barrel(2.48,-.32,s=.72);crate(2.22,-.65,s=.32)
for i in range(17):cube('Pier planks',(.65,-3.64-i*.15,-.055),(1.06,.133,.12),'wood_light',.009)
for x in [.15,1.15]:
 beam('Dock bearer',(x,-3.52,-.17),(x,-6.18,-.17),.085,'wood')
 for y in [-3.78,-4.85,-6.04]:beam('Mooring pile',(x,y,-1.25),(x,y,.26),.075,'wood',8);cone('Mooring cap',(x,y,.28),.1,.1,.07,'wood_light',8)
crate(.38,-5.1,z=.01,s=.32);barrel(.92,-4.45,s=.65)
# Broadside merchant ship with hull strakes, square sails, standing rigging, pennants.
start=set(bpy.data.objects);stations=[(-1.38,.035,.17),(-1.12,.29,.02),(-.62,.43,-.09),(.25,.46,-.08),(.85,.39,.04),(1.12,.28,.25)];v=[]
for yy,ww,zz in stations:v.extend([(-ww,yy,.39+zz*.35),(ww,yy,.39+zz*.35),(-ww*.62,yy,zz-.08),(ww*.62,yy,zz-.08)])
f=[]
for j in range(5):
 a=j*4;b=(j+1)*4;f.extend([(a,b,b+2,a+2),(a+1,a+3,b+3,b+1),(a+2,b+2,b+3,a+3)])
f.extend([(0,2,3,1),(20,21,23,22)]);mesh('Mayflower walnut hull',v,f,'wood');vv=[]
for yy,ww,zz in stations:vv.extend([(-ww,yy,.39+zz*.35),(ww,yy,.39+zz*.35)])
mesh('Mayflower deck',vv,[(j*2,j*2+1,j*2+3,j*2+2) for j in range(5)],'wood_light')
for side in [-1,1]:
 for j in range(5):
  y,w,z=stations[j];ny,nw,nz=stations[j+1];beam('Ship gunwale',(w*side,y,.47+z*.35),(nw*side,ny,.47+nz*.35),.035,'wood_light');beam('Hull strake',(w*.85*side,y,.24+z*.5),(nw*.85*side,ny,.24+nz*.5),.022,'wood_light',4)
cube('Stern cabin',(0,.78,.55),(.63,.56,.42),'wood_light');cube('Stern cabin roof',(0,.8,.78),(.73,.65,.09),'roof_green')
for xx in [-.19,0,.19]:cube('Stern windows',(xx,1.067,.58),(.11,.02,.17),'window_glow')
beam('Bowsprit',(0,-.96,.45),(0,-1.82,.83),.035,'wood_light')
def sail(yy,z,w,h,billow=.2):
 v=[];nx=8;ny=6
 for j in range(ny+1):
  u=j/ny
  for i in range(nx+1):
   t=i/nx;v.append(((t-.5)*w*(1-.11*u),yy-billow*math.sin(math.pi*t)*math.sin(math.pi*u)-.04,z+h*u-.1*math.sin(math.pi*t)*(1-u)))
 f=[(j*(nx+1)+i,j*(nx+1)+i+1,(j+1)*(nx+1)+i+1,(j+1)*(nx+1)+i) for j in range(ny) for i in range(nx)];mesh('Billowing canvas sail',v,f,'canvas');beam('Sail yard',(-w*.55,yy,z+h),(w*.55,yy,z+h),.028,'wood_light')
 for side in [-1,1]:beam('Sail edge rope',(side*w*.5,yy-.04,z),(side*w*.445,yy-.04,z+h),.009,'canvas',4)
for yy,top,w in [(-.48,2.45,1.25),(.45,2.8,1.4)]:
 beam('Tall mast',(0,yy,.32),(0,yy,top+.3),.035,'wood_light');sail(yy,.94,w,.82,.21);sail(yy,1.84,w*.7,.55,.12)
 for side in [-1,1]:beam('Ship rigging',(side*.4,yy-.4,.43),(0,yy,top+.1),.011,'wood',4);beam('Ship rigging',(side*.4,yy+.42,.43),(0,yy,top+.1),.009,'wood',4)
 mesh('Ship pennant',[(0,yy,top+.3),(.38,yy,top+.25),(0,yy,top+.13)],[(0,1,2)],'berry')
mesh('Triangular foresail',[(0,-1.64,.88),(0,-.5,2.49),(0,-.48,1.02)],[(0,1,2)],'canvas');beam('Forestay',(0,-1.81,.85),(0,-.48,2.74),.01,'wood',4);transform(set(bpy.data.objects)-start,2.9,-4.62,-.88,-.35)
dx,dy=-.74,-1.65
ico('Shepherd body',(dx,dy,.22),(.14,.3,.19),'dog',2);ico('Shepherd saddle',(dx,dy+.045,.32),(.145,.19,.12),'wood');ico('Shepherd head',(dx,dy-.27,.43),(.13,.12,.15),'dog');ico('Shepherd muzzle',(dx,dy-.37,.38),(.085,.13,.07),'wood')
for x in [dx-.078,dx+.078]:
 cone('Shepherd ears',(x,dy-.24,.61),.055,0,.19,'wood',4)
 for y in [dy-.17,dy+.2]:beam('Shepherd legs',(x,y,.03),(x,y,.2),.035,'dog',5)
cube('Shepherd pink collar',(dx,dy-.22,.32),(.24,.055,.075),'pink');beam('Shepherd tail',(dx,dy+.21,.3),(dx+.12,dy+.48,.39),.045,'wood')
for xx in [dx-.058,dx+.058]:ico('Shepherd eyes',(xx,dy-.364,.46),(.016,.012,.016),'iron')
for x,y in [(-1.15,-.66),(1.38,-2.58)]:
 beam('Lantern post',(x,y,0),(x,y,1.03),.043,'wood_light');cube('Lantern light',(x,y,1.02),(.14,.14,.2),'window_glow');cone('Lantern cap',(x,y,1.17),.135,0,.12,'iron',4).rotation_euler.z=math.pi/4;cube('Lantern foot',(x,y,.9),(.17,.17,.05),'iron')
cube('Village bench',(-1.35,.08,.36),(.72,.25,.075),'wood_light',.012);cube('Bench back',(-1.35,.18,.58),(.72,.05,.24),'wood_light',.012)
for x in [-1.61,-1.09]:cube('Bench leg',(x,.08,.19),(.06,.16,.34),'wood')
for j in range(5):beam('Firewood',(2.42+j%3*.11,.23,.09+(j//3)*.1),(2.42+j%3*.11,.61,.09+(j//3)*.1),.06,'wood_light',7)
beam('Flagpole',(-.15,-3.6,0),(-.15,-3.6,1.42),.025,'wood_light');mesh('Harbor pennant',[(-.14,-3.6,1.4),(.43,-3.61,1.29),(-.14,-3.6,1.12)],[(0,1,2)],'berry')
# Source remains independently editable; the shipping file uses material batches.
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'assets-source','alderwick-island.blend'))
for ob in list(bpy.context.scene.objects):
 if ob.type=='MESH' and len(ob.data.materials)>1:
  bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob;bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.separate(type='MATERIAL');bpy.ops.object.mode_set(mode='OBJECT')
groups=defaultdict(list)
for ob in list(bpy.context.scene.objects):
 if ob.type=='MESH':groups[ob.data.materials[0].name].append(ob)
for name,obs in groups.items():
 bpy.ops.object.select_all(action='DESELECT')
 for ob in obs:ob.select_set(True)
 bpy.context.view_layer.objects.active=obs[0];bpy.ops.object.join();ob=bpy.context.object;ob.name=name;bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);ob.data.name=name+'_geometry';bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT')
bpy.ops.object.select_all(action='SELECT');out=os.path.join(ROOT,'public','models','alderwick-island.glb')
bpy.ops.export_scene.gltf(filepath=out,export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_cameras=False,export_lights=False,export_materials='EXPORT')
print('EXPORTED',out,os.path.getsize(out),'bytes',len(groups),'meshes',flush=True)
# Preview-only lighting and water are excluded from the shipped GLB.
material('preview_water','668B80');cube('Preview water',(0,0,-.975),(200,200,.1),'preview_water')
world=bpy.context.scene.world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.5,.65,.59,1);world.node_tree.nodes['Background'].inputs[1].default_value=.6
bpy.ops.object.light_add(type='AREA',location=(-3,-7,12));key=bpy.context.object;key.data.energy=1600;key.data.shape='DISK';key.data.size=7;key.rotation_euler=(Vector((0,0,0))-key.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.light_add(type='AREA',location=(8,2,7));bpy.context.object.data.energy=500;bpy.context.object.data.size=8
bpy.ops.object.camera_add(location=(11,-16,12));cam=bpy.context.object;cam.rotation_euler=(Vector((0,-.9,.7))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=16.6;bpy.context.scene.camera=cam
sc=bpy.context.scene;sc.render.engine='CYCLES';sc.cycles.samples=32;sc.cycles.use_denoising=True;sc.render.resolution_x=1500;sc.render.resolution_y=1250;sc.render.resolution_percentage=100;sc.view_settings.view_transform='AgX';sc.render.image_settings.file_format='PNG';sc.render.filepath='/tmp/alderwick-island-preview.png';bpy.ops.render.render(write_still=True)
print('PREVIEW /tmp/alderwick-island-preview.png',flush=True)
