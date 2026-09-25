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
material('brass','C79C4A');material('brass_dark','795730')
material('flag_cloth','954D46');material('grave_slate','777E78');material('grave_carving','A6ABA0')
material('church_clapboard','E6DFC8');material('church_trim','F4EED9');material('roof_church','657063');material('roof_church_courses','818B79')
M['brass'].node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.46
# Dedicated dog colors prevent seasonal vegetation changes from recoloring Khloe.
for name,color in {'shepherd_tan':'B58B56','shepherd_gold':'CBA56F','shepherd_cream':'D9BC8A','shepherd_sable':'554536','shepherd_black':'292A25','shepherd_nose':'202421','shepherd_eye':'120F0C','shepherd_inner_ear':'785F52','shepherd_pink':'D793AD'}.items():material(name,color)
def empty(name,position=(0,0,0)):
 ob=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(ob);ob.location=position;ob.empty_display_type='PLAIN_AXES';ob.empty_display_size=.12;return ob
def parent_preserving_world(ob,parent):
 matrix=ob.matrix_world.copy();ob.parent=parent;ob.matrix_world=matrix
anchor_counts=defaultdict(int)
def anchor(prefix,position):
 index=anchor_counts[prefix];anchor_counts[prefix]+=1;return empty(prefix+'_'+str(index),position)
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
path('Garden lane',[(-2.8,-.7),(-3,-1.07),(-3.08,-1.18)],.26)
def window(x,y,z,w=.32,h=.39,side=False):
 # Put the emitter outside the pane so it can light the wall and path.
 anchor('WindowLight',(x+.28,y,z-.04) if side else (x,y-.28,z-.04))
 if not side:
  cube('Window oak frame',(x,y,z),(w+.085,.055,h+.085),'wood');cube('Warm windowpane',(x,y-.035,z),(w,.035,h),'window_glow');cube('Window mullion',(x,y-.06,z),(.035,.025,h),'wood');cube('Window transom',(x,y-.06,z+.015),(w,.025,.035),'wood');cube('Deep window sill',(x,y-.095,z-h/2-.02),(w+.13,.18,.05),'wood_light')
 else:
  cube('Side window frame',(x,y,z),(.055,w+.085,h+.085),'wood');cube('Side warm windowpane',(x+.035,y,z),(.035,w,h),'window_glow');cube('Side window mullion',(x+.06,y,z),(.025,.035,h),'wood');cube('Side window transom',(x+.06,y,z+.015),(.025,w,.035),'wood');cube('Side window sill',(x+.095,y,z-h/2-.02),(.18,w+.13,.05),'wood_light')
def make_mailbox():
 # A small wall-mounted box. The leaf hinges at its lower edge.
 mailbox=empty('Mailbox');mailbox_start=set(bpy.data.objects)
 # Four walls leave an actual dark interior revealed by the animated front flap.
 cube('Mailbox interior floor',(0,0,.69),(.5,.48,.05),'wood')
 cube('Mailbox left side',(-.25,0,.87),(.055,.48,.37),'roof_green')
 cube('Mailbox right side',(.25,0,.87),(.055,.48,.37),'roof_green')
 cube('Mailbox back',(0,.22,.87),(.5,.05,.37),'roof_green')
 mesh('Mailbox pitched roof',[(-.325,-.31,1.05),(.325,-.31,1.05),(0,-.31,1.225),(-.325,.31,1.05),(.325,.31,1.05),(0,.31,1.225)],[(0,3,5,2),(2,5,4,1),(0,2,1),(3,4,5)],'roof_green_light')
 beam('Mailbox roof ridge',(0,-.33,1.23),(0,.33,1.23),.019,'brass',6)
 # A little raised postal flag makes the object legible even on a small screen.
 beam('Mailbox flag pole',(.307,.015,.83),(.307,.015,1.135),.014,'brass_dark',6)
 cube('Mailbox raised flag',(.307,-.06,1.08),(.022,.155,.105),'berry',.009)
 mailbox_door=empty('MailboxDoor',(0,-.255,.65));door_start=set(bpy.data.objects)
 cube('Mailbox hinged front',(0,-.265,.85),(.455,.047,.37),'roof_green',.012)
 cube('Mailbox cream letter plaque',(0,-.293,.858),(.30,.014,.145),'canvas',.008)
 # Embossed envelope chevron rather than text that would disappear at this scale.
 for sign in [-1,1]:beam('Mailbox envelope seal line',(sign*.143,-.304,.92),(0,-.304,.844),.008,'brass_dark',4)
 ico('Mailbox brass latch',(0,-.314,1.002),(.023,.015,.022),'brass',1)
 for xx in [-.17,.17]:beam('Mailbox hinge pin',(xx-.027,-.262,.65),(xx+.027,-.262,.65),.019,'brass',8)
 bpy.context.view_layer.update()
 for ob in set(bpy.data.objects)-door_start:parent_preserving_world(ob,mailbox_door)
 letter_anchor=empty('PipLetterAnchor',(0,-.34,.87))
 mailbox_objects=set(bpy.data.objects)-mailbox_start;bpy.context.view_layer.update()
 for ob in mailbox_objects:
  if ob.parent not in mailbox_objects:parent_preserving_world(ob,mailbox)
 return mailbox

def cottage(name,x,y,w=1.7,d=1.8,h=1.25,rot=0,green=False,interactive=False):
 start=set(bpy.data.objects);roof='roof_green' if green else 'roof';line='roof_green_light' if green else 'roof_light'
 footprint=anchor('CottageFootprint',(0,0,0))
 for key,value in {'label':name,'wallWidth':w,'wallDepth':d,'roofWidth':w+.32,'roofDepth':d+.34,'wallHeight':h+.17,'roofTop':h+.17+w*.59+.12}.items():footprint[key]=value
 cube('Stone foundation',(0,0,.08),(w+.15,d+.14,.18),'stone',.025)
 wall_material='plaster' if not green else 'plaster_alt'
 if interactive:
  # A genuine opening: no plaster or solid door-surround sits behind the leaf.
  gap=.54;top=1.08;side_width=(w-gap)/2
  for sign in [-1,1]:cube('Entry side wall',(sign*(gap/2+side_width/2),0,.17+h/2),(side_width,d,h),wall_material)
  cube('Entry upper wall',(0,0,(top+.17+h)/2),(gap,d,.17+h-top),wall_material)
  cube('Cottage back wall',(0,d/2-.065,.17+h/2),(gap,.13,h),wall_material)
  cube('Doorway dark interior',(0,-d/2+.34,.625),(.51,.018,.91),'iron')
 else:cube('Limewashed walls',(0,0,.17+h/2),(w,d,h),wall_material)
 rz=.17+h;apex=rz+w*.59
 mesh('Plaster gables',[(-w/2,-d/2,rz),(w/2,-d/2,rz),(0,-d/2,apex),(-w/2,d/2,rz),(w/2,d/2,rz),(0,d/2,apex)],[(0,1,2),(5,4,3)],'plaster');e=w/2+.16;dep=d/2+.17
 for side in [-1,1]:
  mesh('Steep roof',[(side*e,-dep,rz-.03),(side*e,dep,rz-.03),(0,dep,apex+.085),(0,-dep,apex+.085),(side*e,-dep,rz-.12),(side*e,dep,rz-.12),(0,dep,apex),(0,-dep,apex)],[(0,1,2,3),(4,7,6,5),(0,4,5,1),(3,2,6,7),(0,3,7,4),(1,5,6,2)],roof)
  for f in [.25,.5,.75]:
   zz=(rz-.03)*(1-f)+(apex+.085)*f;beam('Shingle courses',(side*e*(1-f),-dep,zz+.012),(side*e*(1-f),dep,zz+.012),.014,line,4)
  for yy in [-dep+.28,0,dep-.3]:beam('Roof seams',(side*e,yy,rz-.02),(0,yy,apex+.095),.01,line,4)
 beam('Ridge cap',(0,-dep-.025,apex+.09),(0,dep+.025,apex+.09),.047,line)
 for xx in [-w/2+.025,w/2-.025]:cube('Corner timber',(xx,-d/2-.012,.16+h/2),(.078,.077,h+.06),'wood_light')
 for zz in [.21,rz-.05]:
  if interactive and zz<1.08:
   for sign in [-1,1]:cube('Front timber',(sign*(.27+(w/2-.27)/2),-d/2-.025,zz),(w/2-.27,.065,.07),'wood_light')
  else:cube('Front timber',(0,-d/2-.025,zz),(w+.025,.065,.07),'wood_light')
  cube('Side timber',(w/2+.025,0,zz),(.065,d,.065),'wood_light')
 for f in [.27,.52,.76]:
  zz=.18+h*f
  if interactive and zz<1.08:
   for sign in [-1,1]:cube('Clapboard front',(sign*(.27+(w/2-.27)/2),-d/2-.012,zz),(w/2-.27,.032,.026),'plaster_alt')
  else:cube('Clapboard front',(0,-d/2-.012,zz),(w,.032,.026),'plaster_alt')
  cube('Clapboard side',(w/2+.013,0,zz),(.032,d,.026),'plaster_alt')
 for side in [-1,1]:beam('Gable timber',(side*w/2,-d/2-.04,rz),(0,-d/2-.04,apex),.035,'wood_light',4)
 beam('Gable kingpost',(0,-d/2-.035,rz),(0,-d/2-.035,apex-.07),.035,'wood_light',4)
 if interactive:
  for xx in [-.29,.29]:cube('Door jamb',(xx,-d/2-.055,.625),(.065,.1,1.025),'wood')
  cube('Door lintel',(0,-d/2-.055,1.105),(.645,.1,.065),'wood')
  door=empty('VillageDoor',(-.25,-d/2-.11,.17));door_start=set(bpy.data.objects)
  cube('Working cottage door',(0,-d/2-.105,.625),(.5,.042,.91),'roof_green')
  for dx in [-.18,-.09,0,.09,.18]:cube('Door boards',(dx,-d/2-.129,.625),(.014,.009,.855),'roof_green_light')
  ico('Brass door latch',(.18,-d/2-.16,.64),(.025,.017,.027),'brass')
  for zz in [.37,.88]:cube('Door iron strap',(-.10,-d/2-.14,zz),(.29,.022,.033),'iron')
  bpy.context.view_layer.update()
  for ob in set(bpy.data.objects)-door_start:parent_preserving_world(ob,door)
  empty('DoorVisitorStart',(0,-d/2+.13,.17));empty('DoorVisitorEnd',(0,-d/2-.76,.03))
  mailbox=make_mailbox();mailbox.scale=(.30,.30,.30);mailbox.location=(.49,-d/2-.081,.125)
 else:
  cube('Door surround',(0,-d/2-.045,.55),(.42,.09,.82),'wood');cube('Forest door',(0,-d/2-.1,.55),(.32,.04,.71),'roof_green')
  for dx in [-.09,0,.09]:cube('Door boards',(dx,-d/2-.126,.55),(.014,.008,.66),'roof_green_light')
  ico('Brass knob',(.11,-d/2-.15,.53),(.035,.022,.035),'leaf_light')
 cube('Front step',(0,-d/2-.23,.085),(.66 if interactive else .59,.36,.14),'stone',.015)
 window(-w*.32,-d/2-.055,.78,w=.3 if w<2 else .4);window(w*.32,-d/2-.055,.78,w=.3 if w<2 else .4);window(w/2+.052,-d*.26,.83,side=True);window(w/2+.052,d*.26,.83,side=True)
 for xx in [-w*.32,w*.32]:
  if interactive and xx>0:continue  # The tiny letterbox occupies this wall below the window.
  cube('Herb box',(xx,-d/2-.17,.48),(.41,.17,.11),'wood_light')
  for dd in [-.12,0,.12]:ico('Window herbs',(xx+dd,-d/2-.17,.59),(.1,.09,.09),'leaf_green')
 cube('Chimney',(-w*.25,d*.24,apex-.04),(.26,.3,.8),'plaster_alt',.025);cube('Chimney cap',(-w*.25,d*.24,apex+.37),(.34,.37,.095),'stone');cube('Chimney soot',(-w*.25,d*.24,apex+.42),(.18,.2,.005),'iron')
 anchor('ChimneySmoke',(-w*.25,d*.24,apex+.435))
 objs=set(bpy.data.objects)-start
 # Transform roots only: bell meshes already inherit their animated parent.
 transform([ob for ob in objs if ob.parent not in objs],x,y,rot=rot)
 for ob in objs:
  if ob.type!='EMPTY':ob.name=name+' | '+ob.name
def make_church_bell(x,y,pivot_z):
 bell=empty('ChurchBell');before=set(bpy.data.objects)
 profile=[(.185,-.36),(.18,-.325),(.15,-.30),(.115,-.22),(.09,-.125),(.065,-.075)]
 vertices=[];sides=16
 for radius,zz in profile:vertices.extend([(math.cos(i*math.tau/sides)*radius,math.sin(i*math.tau/sides)*radius,zz) for i in range(sides)])
 faces=[]
 for band in range(len(profile)-1):
  for i in range(sides):faces.append((band*sides+i,band*sides+(i+1)%sides,(band+1)*sides+(i+1)%sides,(band+1)*sides+i))
 faces.append(tuple(range((len(profile)-1)*sides,len(profile)*sides)))
 mesh('Flared colonial brass bell',vertices,faces,'brass')
 cone('Bell mouth shadow',(0,0,-.343),.156,.156,.012,'brass_dark',16)
 beam('Bell crown',(0,0,-.08),(0,0,-.005),.038,'brass',8)
 beam('Bell clapper stem',(0,0,-.30),(0,0,-.40),.017,'iron',6)
 ico('Bell clapper',(0,0,-.403),(.035,.035,.04),'brass_dark',2)
 hit=empty('BellHitArea',(0,0,-.22));hit['radius']=.25
 bpy.context.view_layer.update()
 for ob in set(bpy.data.objects)-before:parent_preserving_world(ob,bell)
 bell.location=(x,y,pivot_z)
 return bell

def church_window(x,y,z,w=.30,h=.88,turn=0):
 before=set(bpy.data.objects)
 light=anchor('WindowLight',(0,-.29,-.04));light['building']='church'
 cube('Church sash frame',(0,0,0),(w+.09,.065,h+.09),'church_trim')
 cube('Church warm windowpane',(0,-.042,0),(w,.028,h),'window_glow')
 cube('Church sash mullion',(0,-.066,0),(.022,.021,h),'church_trim')
 for zz in [-h/3,0,h/3]:cube('Church sash rail',(0,-.067,zz),(w,.022,.021),'church_trim')
 cube('Church window sill',(0,-.085,-h/2-.055),(w+.16,.18,.065),'church_trim')
 cube('Church window head',(0,-.025,h/2+.057),(w+.14,.105,.04),'church_trim')
 transform(set(bpy.data.objects)-before,x,y,z,turn)

def colonial_church(x,y,rot=-.06):
 # Inspired by early colonial timber churches, especially the documented 1725-26
 # clapboard nave/front tower of Trinity Newport. This is an original miniature.
 start=set(bpy.data.objects);w=1.8;d=2.35;eave=1.78;apex=2.72;ty=-d/2-.09
 footprint=anchor('CottageFootprint',(0,0,0))
 for key,value in {'label':'Alderwick colonial church','wallWidth':w,'wallDepth':d,'roofWidth':w+.30,'roofDepth':d+.30,'wallHeight':eave,'roofTop':apex+.08,'towerForwardOffset':-ty,'towerDepth':.66,'spireTop':4.7}.items():footprint[key]=value
 cube('Church stone foundation',(0,0,.085),(w+.16,d+.15,.17),'stone',.025)
 cube('Church rectangular clapboard nave',(0,0,.975),(w,d,1.60),'church_clapboard')
 for zz in [.26+i*.105 for i in range(15)]:
  for sign in [-1,1]:cube('Church side clapboard reveal',(sign*(w/2+.007),0,zz),(.023,d,.016),'church_trim')
  cube('Church front clapboard reveal',(0,-d/2-.007,zz),(w,.023,.016),'church_trim')
 for sign in [-1,1]:
  for yy in [-d/2+.028,d/2-.028]:cube('Church corner board',(sign*(w/2-.025),yy,.98),(.083,.08,1.62),'church_trim')
  cube('Church cornice',(sign*(w/2+.022),0,eave),(.10,d+.12,.105),'church_trim')
 mesh('Church gable ends',[(-w/2,-d/2,eave),(w/2,-d/2,eave),(0,-d/2,apex),(-w/2,d/2,eave),(w/2,d/2,eave),(0,d/2,apex)],[(0,1,2),(5,4,3)],'church_clapboard')
 for sign in [-1,1]:
  edge=w/2+.15;dep=d/2+.15
  mesh('Church shingled roof',[(sign*edge,-dep,eave),(sign*edge,dep,eave),(0,dep,apex+.07),(0,-dep,apex+.07),(sign*edge,-dep,eave-.07),(sign*edge,dep,eave-.07),(0,dep,apex),(0,-dep,apex)],[(0,1,2,3),(4,7,6,5),(0,4,5,1),(3,2,6,7),(0,3,7,4),(1,5,6,2)],'roof_church')
  for f in [.17,.34,.51,.68,.85]:
   xx=sign*edge*(1-f);zz=eave*(1-f)+(apex+.07)*f
   beam('Church shingle course',(xx,-dep,zz+.014),(xx,dep,zz+.014),.012,'roof_church_courses',4)
  for yy in [-dep+.16,-.74,-.15,.44,1.03]:beam('Church roof joints',(sign*edge,yy,eave+.01),(0,yy,apex+.08),.008,'roof_church_courses',4)
  beam('Church front gable trim',(sign*w/2,-d/2-.037,eave),(0,-d/2-.037,apex),.028,'church_trim',4)
 beam('Church roof ridge',(0,-d/2-.17,apex+.075),(0,d/2+.17,apex+.075),.04,'roof_church_courses',6)
 for xx in [-.63,.63]:church_window(xx,-d/2-.016,1.135,w=.28,h=.88)
 for sign in [-1,1]:
  for yy in [-.74,0,.74]:church_window(sign*(w/2+.016),yy,1.12,w=.31,h=.91,turn=sign*math.pi/2)
 # Square tower projects from the center of the front gable. No tavern sign,
 # flower boxes or chimney: its long nave, sash rhythm and steeple read as church.
 cube('Church square front tower',(0,ty,1.38),(.74,.66,2.42),'church_clapboard')
 for zz in [.27+i*.115 for i in range(20)]:
  cube('Tower front clapboard',(0,ty-.337,zz),(.74,.024,.016),'church_trim')
  for sign in [-1,1]:cube('Tower side clapboard',(sign*.377,ty,zz),(.024,.66,.016),'church_trim')
 for sign in [-1,1]:
  cube('Tower front corner pilaster',(sign*.333,ty-.348,1.39),(.082,.07,2.44),'church_trim')
  cube('Tower rear corner pilaster',(sign*.333,ty+.293,1.39),(.075,.075,2.44),'church_trim')
 # Centered paired timber entrance with a restrained classical pediment.
 cube('Church entry surround',(0,ty-.36,.66),(.60,.09,1.01),'church_trim')
 for sign in [-1,1]:
  cube('Church double entry door',(sign*.121,ty-.415,.65),(.231,.045,.88),'wood')
  for zz in [.40,.81]:cube('Church door raised panel',(sign*.121,ty-.444,zz),(.172,.018,.28),'wood_light',.006)
  ico('Church brass door pull',(sign*.045,ty-.46,.67),(.016,.012,.023),'brass',1)
  beam('Church doorway pediment',(sign*.33,ty-.44,1.19),(0,ty-.44,1.35),.025,'church_trim',4)
 cube('Church entry lintel',(0,ty-.39,1.18),(.68,.15,.075),'church_trim')
 cube('Church top entry step',(0,ty-.43,.135),(.76,.28,.16),'stone',.012)
 cube('Church lower entry step',(0,ty-.57,.07),(.86,.24,.10),'stone',.012)
 church_window(0,ty-.35,1.96,w=.26,h=.61)
 cube('Tower lower cornice',(0,ty,2.64),(.92,.86,.15),'church_trim')
 # Open belfry: the brass bell remains fully visible and independently ringable.
 for xx in [-.29,.29]:
  for yy in [ty-.275,ty+.275]:cube('Open belfry post',(xx,yy,3.005),(.078,.078,.67),'church_trim')
 for yy in [ty-.276,ty+.276]:cube('Belfry horizontal lintel',(0,yy,3.32),(.65,.078,.105),'church_trim')
 beam('Bell suspension axle',(-.33,ty,3.24),(.33,ty,3.24),.025,'iron',8)
 make_church_bell(0,ty,3.24)
 cube('Belfry upper cornice',(0,ty,3.41),(.87,.86,.15),'church_trim')
 cone('Steeple hipped cap',(0,ty,3.57),.64,.29,.18,'roof_church',4).rotation_euler.z=math.pi/4
 cone('Spire octagonal base',(0,ty,3.72),.285,.25,.16,'church_trim',8)
 cone('Simple church spire',(0,ty,4.115),.25,0,.67,'roof_church',8)
 ico('Steeple brass finial',(0,ty,4.475),(.035,.035,.035),'brass',1)
 beam('Simple steeple cross',(0,ty,4.49),(0,ty,4.70),.015,'brass',6)
 beam('Steeple cross arms',(-.064,ty,4.635),(.064,ty,4.635),.013,'brass',6)
 objs=set(bpy.data.objects)-start
 transform([ob for ob in objs if ob.parent not in objs],x,y,rot=rot)
 for ob in objs:
  if ob.type!='EMPTY':ob.name='Colonial church | '+ob.name

colonial_church(.68,1.30)
cottage('Fisher cottage',-2.25,.5,1.55,1.62,1.14,.17,green=True,interactive=True)
cottage('Harbor workshop',3.22,.85,1.42,1.6,1.07,-.25)
# The entire 1.16-by-0.86 roof clears both lanes, with room for a visitor
# at the front opening; the old well sat directly across Village lane.
wx,wy=2.03,-1.94
well_start=set(bpy.data.objects)
cone('Well stone curb',(wx,wy,.2),.36,.36,.4,'stone',12);cone('Dark well water',(wx,wy,.41),.28,.28,.006,'roof_green',12)
for xx in [wx-.35,wx+.35]:cube('Well upright',(xx,wy,.58),(.07,.08,1.15),'wood_light')
beam('Well axle',(wx-.43,wy,.9),(wx+.43,wy,.9),.065,'wood',8);beam('Well rope',(wx,wy,.89),(wx,wy,.80),.015,'canvas',5)
mesh('Well roof',[(wx-.58,wy-.43,1.13),(wx+.58,wy-.43,1.13),(wx+.58,wy,1.47),(wx-.58,wy,1.47),(wx-.58,wy+.43,1.13),(wx+.58,wy+.43,1.13)],[(0,1,2,3),(3,2,5,4)],'roof_green')
# A visible stave bucket hangs just above the stone rim. Its handle pivot permits
# a gentle swing or a short rise without moving the well's architecture.
bucket=empty('WellBucket',(wx,wy,.80));bucket_start=set(bpy.data.objects)
cone('Well bucket staves',(wx,wy,.555),.12,.153,.22,'wood_light',12)
cone('Bucket dark opening',(wx,wy,.668),.125,.125,.007,'wood',12)
for zz,radius in [(.47,.128),(.633,.15)]:cone('Bucket iron hoop',(wx,wy,zz),radius,radius,.028,'iron',12)
for sign in [-1,1]:beam('Bucket iron handle',(wx+sign*.14,wy,.64),(wx,wy,.80),.015,'iron',6)
bpy.context.view_layer.update()
for ob in set(bpy.data.objects)-bucket_start:parent_preserving_world(ob,bucket)
well_objects=set(bpy.data.objects)-well_start;well=empty('WishingWell',(wx,wy,0));bpy.context.view_layer.update()
for ob in well_objects:
 if ob.parent not in well_objects:parent_preserving_world(ob,well)
# A low, forward toss passes under the roof and beside the suspended bucket.
# Runtime follows these anchors instead of deriving a start above the roof.
for name,position in [('WellTossAnchor',(wx+.205,wy-.71,.62)),('WellWishAnchor',(wx+.205,wy-.025,.414))]:
 ob=empty(name,position);bpy.context.view_layer.update();parent_preserving_world(ob,well)

# Plain slate markers with arched shoulders belong to the churchyard rather
# than the village lanes. Both face the island's rear, with a small grassy
# grave in front of the eastern marker for an occasional playful visitor.
def headstone(x,y,w=.35,h=.48,tilt=0):
 before=set(bpy.data.objects);d=.085;outline=[(-w/2,.045),(w/2,.045),(w/2,h-.13)]
 for i in range(1,9):
  a=i*math.pi/8;outline.append((math.cos(a)*w/2,h-.13+math.sin(a)*.13))
 vertices=[(xx,yy,zz) for yy in [-d/2,d/2] for xx,zz in outline];n=len(outline)
 faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
 mesh('Churchyard arched slate headstone',vertices,faces,'grave_slate')
 cube('Headstone weathered foot',(0,0,.035),(w+.10,.15,.07),'stone',.012)
 # A restrained incised cross and two short epitaph lines read at miniature scale.
 beam('Headstone carved cross upright',(0,d/2+.002,.25),(0,d/2+.002,.385),.009,'grave_carving',4)
 beam('Headstone carved cross arms',(-.047,d/2+.003,.335),(.047,d/2+.003,.335),.008,'grave_carving',4)
 for zz,ww in [(.18,.19),(.13,.14)]:cube('Headstone epitaph line',(0,d/2+.005,zz),(ww,.004,.012),'grave_carving')
 transform(set(bpy.data.objects)-before,x,y,rot=tilt)
headstone(.48,2.95,w=.31,h=.44,tilt=-.06)
headstone(1.08,2.95,w=.36,h=.52,tilt=.055)
empty('GraveHandAnchor',(1.08,3.20,.025))
empty('BackIslandGhostAnchor',(-1.8,3.55,0))

def tree(x,y,s=1,k='leaf_gold'):
 canopy=anchor('TreeCanopy',(x+.06*s,y,1.75*s));canopy['radius']=.82*s
 z=1.45*s;beam('Alder trunk',(x,y,0),(x+.07*s,y,z),.12*s,'wood_light')
 for dx,dy in [(-.36,0),(.3,.19),(.12,-.32)]:beam('Alder bough',(x,y,.72*s),(x+dx*s,y+dy*s,z+.2*s),.055*s,'wood_light',5)
 for dx,dy,dz,ss in [(-.31,0,.02,.68),(.36,.1,.17,.65),(.04,-.29,.19,.69),(.05,.13,.61,.64)]:
  o=ico('Alder crown',(x+dx*s,y+dy*s,z+dz*s),(ss*s,ss*s*.88,ss*s*.96),k,2);o.rotation_euler=(random.random()*.4,random.random()*.4,random.random()*math.tau)
 ico('Alder crown tip',(x-.13*s,y+.15*s,z+.74*s),(.38*s,.36*s,.35*s),'leaf_light' if k=='leaf_gold' else k)
def pine(x,y,s=1):
 beam('Pine trunk',(x,y,0),(x,y,2.1*s),.1*s,'wood_light')
 for i,(z,r) in enumerate([(1.02,.74),(1.53,.6),(1.97,.44)]):cone('Evergreen canopy',(x,y,z*s),r*s,0,1.25*s,'leaf_pine' if i%2==0 else 'leaf_pine_light',7).rotation_euler.z=i*.5
# The final alder is on the southwest shore, keeping the garden clear from
# the default northeast camera while retaining all twelve canopy anchors.
for x,y,s,k in [(-4.4,.75,1.15,'leaf_orange'),(-4.7,-.5,1.03,'leaf_gold'),(-4.6,1.8,.95,'leaf_gold'),(-2.5,2.9,1.07,'leaf_gold'),(-1,3.02,1.2,'leaf_orange'),(1.8,3,1.05,'leaf_green'),(3.2,2.43,1.2,'leaf_gold'),(4.28,1.43,1.08,'leaf_orange'),(4.7,-.18,1.02,'leaf_gold'),(3.67,-1.3,.78,'leaf_green'),(-4,-2,.74,'leaf_orange'),(-3.3,-3.15,.77,'leaf_gold')]:tree(x,y,s,k)
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
garden=empty('GardenPlot',(-3.14,-1.8,0));garden['width']=1.22;garden['depth']=.98
def barrel(x,y,z=0,s=1):
 cone('Oak barrel',(x,y,z+.2*s),.18*s,.17*s,.4*s,'wood_light',10)
 for zz in [.09,.3]:cone('Barrel hoop',(x,y,z+zz*s),.186*s,.186*s,.037*s,'iron',10)
def crate(x,y,z=0,s=.4):
 cube('Supply crate',(x,y,z+s/2),(s,s,s),'wood_light',.012)
 for zz in [z+.05,z+s-.05]:cube('Crate crossbar',(x,y-s/2-.013,zz),(s+.015,.028,.053),'wood')
 beam('Crate diagonal',(x-s*.4,y-s/2-.031,z+.06),(x+s*.4,y-s/2-.031,z+s-.06),.028,'wood',4)
# Tuck supplies into the workshop's side yard, north of the public lane.
barrel(2.01,.28,s=.87);barrel(2.03,.64,s=.72);crate(1.77,.035,s=.32)
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
f.extend([(0,2,3,1),(20,21,23,22)]);mesh('ShipHullBoundary',v,f,'wood');vv=[]
for yy,ww,zz in stations:vv.extend([(-ww,yy,.39+zz*.35),(ww,yy,.39+zz*.35)])
mesh('Mayflower deck',vv,[(j*2,j*2+1,j*2+3,j*2+2) for j in range(5)],'wood_light')
for side in [-1,1]:
 for j in range(5):
  y,w,z=stations[j];ny,nw,nz=stations[j+1];beam('Ship gunwale',(w*side,y,.47+z*.35),(nw*side,ny,.47+nz*.35),.035,'wood_light');beam('Hull strake',(w*.85*side,y,.24+z*.5),(nw*.85*side,ny,.24+nz*.5),.022,'wood_light',4)
cube('Stern cabin',(0,.78,.55),(.63,.56,.42),'wood_light');cube('Stern cabin roof',(0,.8,.78),(.73,.65,.09),'roof_green')
for xx in [-.19,0,.19]:cube('Stern windows',(xx,1.067,.58),(.11,.02,.17),'window_glow')
# Two small stern lanterns and a cabin emitter travel with the vessel. Their
# anchors stay children of MerchantShip, so rocking also moves their light.
for xx in [-.32,.32]:
 beam('Ship lantern bracket',(xx,.76,.805),(xx,.76,.99),.018,'iron',6)
 cube('Ship lantern glass',(xx,.76,1.02),(.115,.105,.15),'window_glow')
 cube('Ship lantern base',(xx,.76,.936),(.137,.127,.025),'iron')
 cone('Ship lantern cap',(xx,.76,1.112),.103,0,.07,'iron',4).rotation_euler.z=math.pi/4
 for sign in [-1,1]:beam('Ship lantern corner',(xx+sign*.058,.704,.945),(xx+sign*.058,.704,1.095),.008,'iron',4)
 anchor('ShipLanternLight',(xx,.76,1.025))
cabin_light=anchor('ShipLanternLight',(0,1.13,.59));cabin_light['kind']='cabin'
beam('Bowsprit',(0,-.96,.45),(0,-1.82,.83),.035,'wood_light')
def sail(yy,z,w,h,billow=.2):
 v=[];nx=8;ny=6
 for j in range(ny+1):
  u=j/ny
  for i in range(nx+1):
   t=i/nx;v.append(((t-.5)*w*(1-.11*u),yy-billow*math.sin(math.pi*t)*math.sin(math.pi*u)-.04,z+h*u-.1*math.sin(math.pi*t)*(1-u)))
 f=[(j*(nx+1)+i,j*(nx+1)+i+1,(j+1)*(nx+1)+i+1,(j+1)*(nx+1)+i) for j in range(ny) for i in range(nx)];mesh('Billowing canvas sail',v,f,'canvas');beam('Sail yard',(-w*.55,yy,z+h),(w*.55,yy,z+h),.028,'wood_light')
 for side in [-1,1]:beam('Sail edge rope',(side*w*.5,yy-.04,z),(side*w*.445,yy-.04,z+h),.009,'canvas',4)
def cloth_pennant(name,p,length,height):
 # Separate subdivided cloth: runtime bends +X progressively away from the
 # fixed hoist. Local Z before export is vertical; local Y becomes depth.
 vertices=[];nx=12;ny=4
 for j in range(ny+1):
  v=j/ny
  for i in range(nx+1):
   t=i/nx;center=-height*.5+height*.13*t
   vertices.append((length*t,.018*math.sin(t*math.pi*1.6)*t,center+(.5-v)*height*(1-t)))
 faces=[(j*(nx+1)+i,j*(nx+1)+i+1,(j+1)*(nx+1)+i+1,(j+1)*(nx+1)+i) for j in range(ny) for i in range(nx)]
 ob=mesh(name,vertices,faces,'flag_cloth');ob.location=p
 for key,value in {'hoistAxis':'x','hoistAt':0.0,'flyLength':length,'waveAxis':'z','waveAmplitude':height*.15}.items():ob[key]=value
 return ob

for flag_index,(yy,top,w) in enumerate([(-.48,2.45,1.25),(.45,2.8,1.4)]):
 beam('Tall mast',(0,yy,.32),(0,yy,top+.3),.035,'wood_light');sail(yy,.94,w,.82,.21);sail(yy,1.84,w*.7,.55,.12)
 for side in [-1,1]:beam('Ship rigging',(side*.4,yy-.4,.43),(0,yy,top+.1),.011,'wood',4);beam('Ship rigging',(side*.4,yy+.42,.43),(0,yy,top+.1),.009,'wood',4)
 cloth_pennant('FlagClothShip_'+str(flag_index),(0,yy,top+.3),.38,.17)
mesh('Triangular foresail',[(0,-1.64,.88),(0,-.5,2.49),(0,-.48,1.02)],[(0,1,2)],'canvas');beam('Forestay',(0,-1.81,.85),(0,-.48,2.74),.01,'wood',4)
ship_objects=set(bpy.data.objects)-start
ship=empty('MerchantShip',(3.45,-5.20,-.88));ship.rotation_euler.z=-.55
# The authored hull uses a waterline origin. Parenting before moving the group
# preserves that pivot for bobbing and rocking in the browser.
ship.location=(0,0,0);ship.rotation_euler.z=0;bpy.context.view_layer.update()
for ob in ship_objects:parent_preserving_world(ob,ship)
# A 32% larger vessel has its own berth farther from the island. The hull's
# stern clears the southeast cliff even during a rock; its bowsprit remains
# inside the existing 8.35-unit water disk and clear of the dock.
ship.location=(3.45,-5.20,-.88);ship.rotation_euler.z=-.55;ship.scale=(1.48,1.48,1.48)

# Khloe: an articulated, flat-shaded German Shepherd. Nose points along -Y.
# The feet stand on Z=0; joint empties are the runtime animation contract.
khloe=empty('Khloe')
def joint(name,position):
 ob=empty(name,position);bpy.context.view_layer.update();parent_preserving_world(ob,khloe);return ob
def bind(part,objects):
 bpy.context.view_layer.update()
 for ob in objects:parent_preserving_world(ob,part)
def build_part(part,builder):
 before=set(bpy.data.objects);builder();bind(part,set(bpy.data.objects)-before)
body=joint('KhloeBody',(0,0,.39))
def dog_body():
 # Slightly sloping topline, deep chest, tucked waist, and haunches.
 ico('Khloe tan ribcage',(0,-.02,.38),(.145,.32,.175),'shepherd_tan',2)
 ico('Khloe golden chest',(0,-.225,.37),(.145,.135,.18),'shepherd_gold',2)
 ico('Khloe black saddle',(0,.045,.47),(.146,.265,.1),'shepherd_black',2)
 ico('Khloe sable flank left',(-.127,.085,.37),(.037,.21,.113),'shepherd_sable',1)
 ico('Khloe sable flank right',(.127,.085,.37),(.037,.21,.113),'shepherd_sable',1)
 ico('Khloe cream brisket',(0,-.286,.325),(.097,.04,.125),'shepherd_cream',1)
 for sign in [-1,1]:ico('Khloe hind haunch',(sign*.11,.22,.33),(.075,.105,.135),'shepherd_tan',2)
build_part(body,dog_body)
# Slim the torso without changing her legs, face, posture, or runtime joint names.
body.scale=(.82,1,.90)
head=joint('KhloeHead',(0,-.23,.41))
def dog_head():
 # Upright neck, long wedge muzzle, strong brow, and very tall erect ears.
 neck=ico('Khloe neck',(0,-.275,.49),(.111,.14,.19),'shepherd_gold',2);neck.rotation_euler.x=.32
 ico('Khloe neck sable ruff',(0,-.206,.51),(.12,.071,.16),'shepherd_sable',1)
 ico('Khloe cheek left',(-.07,-.367,.575),(.061,.11,.083),'shepherd_gold',1)
 ico('Khloe cheek right',(.07,-.367,.575),(.061,.11,.083),'shepherd_gold',1)
 ico('Khloe head wedge',(0,-.386,.604),(.103,.141,.113),'shepherd_sable',2)
 ico('Khloe tan forehead',(0,-.378,.669),(.076,.103,.059),'shepherd_tan',1)
 muzzle=ico('Khloe long black muzzle',(0,-.511,.56),(.07,.131,.058),'shepherd_black',1);muzzle.rotation_euler.x=-.075
 ico('Khloe lower jaw',(0,-.5,.533),(.056,.112,.022),'shepherd_tan',1)
 ico('Khloe black nose',(0,-.619,.566),(.055,.036,.04),'shepherd_nose',1)
 for sign in [-1,1]:
  # Thin triangular ears, with ear opening toward her nose. Outer tips splay subtly.
  bx=sign*.066
  mesh('Khloe upright pointed ear',[(bx-.044,-.359,.676),(bx+.044,-.359,.676),(bx+sign*.022,-.324,.815),(bx-.035,-.305,.671),(bx+.035,-.305,.671)],[(0,1,2),(2,4,3),(0,2,3),(1,4,2),(0,3,4,1)],'shepherd_black')
  mesh('Khloe warm ear inset',[(bx-.029,-.363,.69),(bx+.029,-.363,.69),(bx+sign*.017,-.334,.784)],[(0,1,2)],'shepherd_inner_ear')
  eye=ico('Khloe dark almond eye',(sign*.082,-.456,.626),(.018,.016,.017),'shepherd_eye',1)
  ico('Khloe eye glint',(sign*.085,-.468,.633),(.004,.004,.004),'shepherd_cream',1)
  brow=ico('Khloe golden eyebrow',(sign*.07,-.447,.654),(.034,.028,.016),'shepherd_gold',1);brow.rotation_euler.y=sign*.17
 # A bright continuous collar and a small brass tag read clearly at hero scale.
 collar=cone('Khloe pink collar',(0,-.288,.466),.119,.119,.055,'shepherd_pink',10);collar.rotation_euler.x=.34
 ico('Khloe brass collar tag',(0,-.409,.444),(.025,.012,.031),'leaf_light',1)
build_part(head,dog_head)
# The whole leg turns at its shoulder or hip. The hind-leg silhouette includes
# the breed's characteristic bent stifle and low rear hock.
for side,sign in [('L',-1),('R',1)]:
 for placement,yy in [('F',-.21),('B',.21)]:
  xx=sign*.107;pivot_z=.375 if placement=='F' else .36
  leg=joint('KhloeLeg'+placement+side,(xx,yy,pivot_z))
  before=set(bpy.data.objects)
  if placement=='F':
   beam('Khloe front upper leg',(xx,yy,.375),(xx,yy+.015,.205),.039,'shepherd_tan',6)
   beam('Khloe front lower leg',(xx,yy+.015,.205),(xx,yy-.002,.045),.029,'shepherd_gold',6)
   ico('Khloe front paw',(xx,yy-.03,.032),(.049,.077,.032),'shepherd_gold',1)
  else:
   beam('Khloe hind thigh',(xx,yy,.36),(xx,yy-.065,.203),.051,'shepherd_tan',6)
   beam('Khloe hind hock',(xx,yy-.065,.203),(xx,yy+.07,.106),.032,'shepherd_gold',6)
   beam('Khloe hind pastern',(xx,yy+.07,.106),(xx,yy+.05,.04),.026,'shepherd_gold',6)
   ico('Khloe hind paw',(xx,yy+.016,.03),(.046,.074,.03),'shepherd_gold',1)
  bind(leg,set(bpy.data.objects)-before)
tail=joint('KhloeTail',(0,.268,.415))
def dog_tail():
 # Heavy feathered tail curves downward at rest instead of curling like a husky.
 beam('Khloe tail upper',(0,.265,.416),(.045,.395,.334),.068,'shepherd_sable',7)
 beam('Khloe tail middle',(.045,.395,.334),(.088,.529,.222),.065,'shepherd_sable',7)
 beam('Khloe tail lower',(.088,.529,.222),(.105,.644,.167),.046,'shepherd_black',7)
 beam('Khloe tail tip',(.105,.644,.167),(.095,.71,.19),.027,'shepherd_black',6)
build_part(tail,dog_tail)
khloe.location=(-.74,-1.65,0);khloe.scale=(.86,.86,.86)
# Keep only the harbor lamp; remove the post crowding Fisher cottage entirely.
for x,y in [(1.38,-2.58)]:
 anchor('LanternLight',(x,y,1.02))
 beam('Lantern post',(x,y,0),(x,y,1.03),.043,'wood_light');cube('Lantern light',(x,y,1.02),(.14,.14,.2),'window_glow');cone('Lantern cap',(x,y,1.17),.135,0,.12,'iron',4).rotation_euler.z=math.pi/4;cube('Lantern foot',(x,y,.9),(.17,.17,.05),'iron')
cube('Village bench',(-.88,-.05,.36),(.72,.25,.075),'wood_light',.012);cube('Bench back',(-.88,.05,.58),(.72,.05,.24),'wood_light',.012)
for x in [-1.14,-.62]:cube('Bench leg',(x,-.05,.19),(.06,.16,.34),'wood')
for j in range(5):beam('Firewood',(2.42+j%3*.11,.23,.09+(j//3)*.1),(2.42+j%3*.11,.61,.09+(j//3)*.1),.06,'wood_light',7)
beam('Flagpole',(-.15,-3.6,0),(-.15,-3.6,1.42),.025,'wood_light');cloth_pennant('FlagClothHarbor',(-.14,-3.6,1.4),.57,.28)
# Source remains independently editable; the shipping file uses material batches.
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'assets-source','alderwick-island.blend'))
for ob in list(bpy.context.scene.objects):
 if ob.type=='MESH' and len(ob.data.materials)>1:
  bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob;bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.separate(type='MATERIAL');bpy.ops.object.mode_set(mode='OBJECT')
groups=defaultdict(list)
for ob in list(bpy.context.scene.objects):
 if ob.type=='MESH' and not ob.name.startswith('FlagCloth') and ob.name!='ShipHullBoundary':
  # Preserve cloth vertex grids and the vessel's actual collision silhouette.
  # Never merge a moving limb or ship into static island batches.
  parent_name=ob.parent.name if ob.parent else 'static'
  groups[(parent_name,ob.data.materials[0].name)].append(ob)
for (parent_name,material_name),obs in groups.items():
 name=material_name if parent_name=='static' else parent_name+'__'+material_name
 bpy.ops.object.select_all(action='DESELECT')
 for ob in obs:ob.select_set(True)
 bpy.context.view_layer.objects.active=obs[0];bpy.ops.object.join();ob=bpy.context.object;ob.name=name;bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);ob.data.name=name+'_geometry';bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT')
bpy.ops.object.select_all(action='SELECT');out=os.path.join(ROOT,'public','models','alderwick-island.glb')
bpy.ops.export_scene.gltf(filepath=out,export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_cameras=False,export_lights=False,export_materials='EXPORT',export_extras=True)
print('EXPORTED',out,os.path.getsize(out),'bytes',sum(ob.type=='MESH' for ob in bpy.context.scene.objects),'meshes',flush=True)
# Preview-only lighting and water are excluded from the shipped GLB.
material('preview_water','668B80');cube('Preview water',(0,0,-.975),(200,200,.1),'preview_water')
world=bpy.context.scene.world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.5,.65,.59,1);world.node_tree.nodes['Background'].inputs[1].default_value=.6
bpy.ops.object.light_add(type='AREA',location=(-3,-7,12));key=bpy.context.object;key.data.energy=1600;key.data.shape='DISK';key.data.size=7;key.rotation_euler=(Vector((0,0,0))-key.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.light_add(type='AREA',location=(8,2,7));bpy.context.object.data.energy=500;bpy.context.object.data.size=8
bpy.ops.object.camera_add(location=(11,-16,12));cam=bpy.context.object;cam.rotation_euler=(Vector((0,-.9,.7))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=16.6;bpy.context.scene.camera=cam
sc=bpy.context.scene;sc.render.engine='CYCLES';sc.cycles.samples=32;sc.cycles.use_denoising=True;sc.render.resolution_x=1500;sc.render.resolution_y=1250;sc.render.resolution_percentage=100;sc.view_settings.view_transform='AgX';sc.render.image_settings.file_format='PNG';sc.render.filepath='/tmp/alderwick-island-preview.png';bpy.ops.render.render(write_still=True)
print('PREVIEW /tmp/alderwick-island-preview.png',flush=True)
