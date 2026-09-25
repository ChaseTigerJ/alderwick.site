"""Build Alderwick's Khloé from the vendored CC0 Quaternius rig.

Run: Blender --background --python assets-source/khloe/build_khloe.py
The original asset and provenance remain unchanged under vendor/. This builder
removes the source adventure gear, remodels the continuous anatomical surface,
authors a texture-free German Shepherd coat, and fits facial/collar details.
"""
from pathlib import Path
import bpy, bmesh, math, json, sys
from mathutils import Vector, Matrix
HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE))
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(HERE/'vendor/quaternius-german-shepherd.gltf'))
body=next(o for o in bpy.data.objects if o.type=='MESH')
arm=next(o for o in bpy.data.objects if o.type=='ARMATURE');arm.data.pose_position='REST'
# The author pack also contains an unrelated unskinned helper icosphere.
for ob in list(bpy.data.objects):
 if ob.type=='MESH' and ob!=body:bpy.data.objects.remove(ob,do_unlink=True)
# Weld only duplicate export seams; identify the anatomical component by size.
bm=bmesh.new();bm.from_mesh(body.data)
bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-6)
bm.verts.ensure_lookup_table();seen=set();components=[]
for vertex in bm.verts:
 if vertex in seen:continue
 pending=[vertex];seen.add(vertex);component=[]
 while pending:
  vertex=pending.pop();component.append(vertex)
  for edge in vertex.link_edges:
   other=edge.other_vert(vertex)
   if other not in seen:seen.add(other);pending.append(other)
 components.append(component)
keep=set(max(components,key=len))
bmesh.ops.delete(bm,geom=[v for v in bm.verts if v not in keep],context='VERTS')
bm.to_mesh(body.data);bm.free();body.data.update()
# Continuous-surface shaping of the source cage; no stacked body primitives.
source_positions=[v.co.copy() for v in body.data.vertices]
tail_root=Vector((0,.255339,.479147));turn=Matrix.Rotation(math.radians(-42),4,'X')
for v in body.data.vertices:
 p=v.co;groups={body.vertex_groups[g.group].name:g.weight for g in v.groups}
 tw=sum(w for n,w in groups.items() if n.startswith('Tail'));ear=sum(w for n,w in groups.items() if n.startswith('Ear'))
 if tw>.001:
  q=tail_root+turn.to_3x3()@(p-tail_root);p[:]=p.lerp(q,min(tw,1))
 elif ear>.001:
  f=max(0,min(1,(p.z-.82)/.13));p.x*=1-.21*f;p.z+=.017*f
  center=.052+.039*f;half_width=.044*(1-f)+.005;fold=max(0,1-abs(abs(p.x)-center)/max(.001,half_width*.65));p.y+=.007*fold*math.sin(f*math.pi)
 else:
  # Keep the breast deep but make ribs, loin and cheeks read athletic.
  if p.y>-.32 and p.z>.28:p.x*=.83
  if .04<p.y<.36 and p.z>.42:p.z-=.018*math.sin((p.y-.04)/.32*math.pi)*max(0,min(1,(p.z-.42)/.14))
  backlower=sum(w for n,w in groups.items() if n.startswith('BackLowerLeg'))
  if backlower>.15 and .09<p.z<.26:p.y+=.013*max(0,1-abs(p.z-.18)/.09)*backlower
  if -.28<p.y<.37 and p.z>.49:
   top=.637-.070*max(0,min(1,(p.y+.28)/.60));p.z=.49+(p.z-.49)*(top-.49)/(.674-.49)
  if -.06<p.y<.25 and .25<p.z<.46:p.z+=.034*math.sin((p.y+.06)/.31*math.pi)*max(0,1-(p.z-.25)/.21)
  if p.y<-.45 and p.z>.58:
   if abs(p.x)>.070:p.x*=.89
   if p.y<-.66 and p.z>.715:p.x*=1.12
   if .65<p.z<.775 and abs(p.x)>.060:p.x*=.82
   if p.y<-.55 and .585<p.z<.717:
    f=max(0,min(1,(-p.y-.55)/.055));p.z=p.z*(1-f)+(.702+(p.z-.70)*.13)*f;p.x*=1-.12*f
   if p.y<-.62:
    f=max(0,min(1,(-p.y-.62)/.04));p.z=.726+(p.z-.726)*(1+.45*f);p.y=-.62+(p.y+.62)*1.22
  # Convert the hanging scarf point into a clean close-lying neck/chest.
  if p.y<-.38 and .32<p.z<.635:
   target=-.337-(p.z-.32)*.46
   if p.y<target:p.y=p.y*.16+target*.84
# Give the muzzle a stronger German Shepherd wedge without adding length.
# This pass applies to all head skin, including vertices blended to ear roots;
# smoothly feather the cheek transition rather than pinching the bridge.
def smoothstep(a,b,x):
 t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
for vertex in body.data.vertices:
 p=vertex.co
 fullness=smoothstep(.575,.670,-p.y)*smoothstep(.635,.680,p.z)*(1-smoothstep(.790,.827,p.z))
 if fullness:
  p.x*=1+.27*fullness
  p.z=.726+(p.z-.726)*(1+.20*fullness)
# Close the original open lower jaw against the new muzzle. Its lip advances
# under the snout while the ventral surface retains enough depth to read as a
# real jaw, not the paper-thin flap produced by compressing the whole mouth.
for vertex,original in zip(body.data.vertices,source_positions):
 if original.y<-.595 and original.z<.655:
  amount=smoothstep(.595,.660,-original.y)*(1-smoothstep(.645,.665,original.z))
  vertex.co.y-=.033*amount
  vertex.co.z+=(.010-.011*(1-smoothstep(.604,.621,original.z)))*amount
# Low, naturally curved tail bones match the rest-surface deformation.
bpy.context.view_layer.objects.active=arm;bpy.ops.object.mode_set(mode='EDIT')
for b in arm.data.edit_bones:
 if b.name.startswith('Tail'):
  b.head=tail_root+turn.to_3x3()@(b.head-tail_root);b.tail=tail_root+turn.to_3x3()@(b.tail-tail_root)
bpy.ops.object.mode_set(mode='OBJECT')
# Restore coherent broader planes, then add one controlled refinement level.
bm=bmesh.new();bm.from_mesh(body.data);bmesh.ops.join_triangles(bm,faces=list(bm.faces),angle_face_threshold=.75,angle_shape_threshold=3.14,cmp_seam=False,cmp_sharp=False,cmp_uvs=False,cmp_vcols=False,cmp_materials=False);bm.to_mesh(body.data);bm.free()
bpy.context.view_layer.objects.active=body;body.select_set(True);sub=body.modifiers.new('Anatomical surface refinement','SUBSURF');sub.levels=1;sub.render_levels=1;bpy.ops.object.modifier_move_up(modifier=sub.name);bpy.ops.object.modifier_apply(modifier=sub.name)

def linear(h):
 rgb=[int(h[i:i+2],16)/255 for i in (0,2,4)];return tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb)
def mat(n,c,rough=.78):
 m=bpy.data.materials.new(n);m.use_nodes=True;m.diffuse_color=(*linear(c),1);p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*linear(c),1);p.inputs['Roughness'].default_value=rough;p.inputs['Specular IOR Level'].default_value=.14;return m
palette=[mat('Khloe warm ochre','B98148'),mat('Khloe warm tan','C6945B'),mat('Khloe cream coat','D6AE78'),mat('Khloe charcoal saddle','141518'),mat('Khloe deep mask','151518'),mat('Khloe inner ear','573B30'),mat('Khloe black nose','090A0C',.40),mat('Khloe muted tongue','A35D58')]
body.data.materials.clear()
for m in palette:body.data.materials.append(m)
for p in body.data.polygons:
 c=p.center;x,y,z=c;idx=0
 if y>-.33 and z>.29:
  saddle=.44+.10*math.exp(-((y+.27)/.16)**2)
  idx=3 if z>saddle else 1
 if -.49<y<-.30 and z>.57:idx=3 if p.normal.y>.0 else 0
 if y<-.49 and z>.64:
  idx=4 if z>.839 or abs(x)<(.038+max(0,z-.755)*.13) or y<-.662 else 1
  if z<.69:idx=1
  elif z<.708:idx=4 if y<-.66 else 1
  if .795<z<.839 and abs(x)>.054 and -.625<y<-.50:idx=0
  if y<-.740 and z>.698:idx=6
 if z>.82 and y<-.43:
  f=max(0,min(1,(z-.825)/.13));ear_center=.052+.039*f;half_width=.044*(1-f)+.005
  idx=5 if p.normal.y<-.45 and abs(abs(x)-ear_center)<half_width*.58 and .853<z<.942 else 3
  if .825<z<.861 and abs(x)>.04 and p.normal.y<-.2:idx=0
 if -.625<y<-.485 and .795<z<.866 and abs(x)>.048 and p.normal.y<-.15:idx=0
 tailweight=sum(sum(g.weight for g in body.data.vertices[vi].groups if body.vertex_groups[g.group].name.startswith('Tail')) for vi in p.vertices)/len(p.vertices)
 if tailweight>.15:idx=3 if p.normal.z>-.5 else 0
 elif y>.15 and z<.34:idx=1
 if z<.13:idx=1
 p.material_index=idx;p.use_smooth=False
# Carve shallow socket depressions into the continuous skin, then wrap each
# lid around that curved surface. Only a small dark iris cap occupies the hole.
for v in body.data.vertices:
 p=v.co
 if p.y>-.49 or p.y<-.63:continue
 for sign in [-1,1]:
  r=((p.x-sign*.0705)/.0293)**2+((p.z-.771)/.0256)**2
  if r<1:p.y+=.0045*(1-r)
body.data.update();bpy.context.view_layer.update()
for sign in [-1,1]:
 origin=Vector((sign*.0705,-1,.771));hit,location,skin_normal,_=body.ray_cast(origin,Vector((0,1,0)))
 if not hit:raise RuntimeError('Eye socket projection missed head')
 center=location+Vector((0,-.0008,0));normal=Vector((sign*.22,-.975,.0)).normalized();horizontal=Vector((.975,sign*.22,0)).normalized();up=Vector((0,0,1))
 shape=[(-1,0),(-.82,.39),(-.5,.65),(0,.75),(.5,.65),(.82,.39),(1,0),(.75,-.34),(.4,-.53),(0,-.59),(-.4,-.53),(-.75,-.34)]
 def surface(name,coords,faces,material):
  me=bpy.data.meshes.new(name);me.from_pydata([tuple(p) for p in coords],[],faces);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);o.data.materials.append(material);g=o.vertex_groups.new(name='Head');g.add(list(range(len(coords))),1,'REPLACE');mod=o.modifiers.new('Khloe facial skin','ARMATURE');mod.object=arm;o.parent=arm;return o
 eyelid=mat('Khloe skin eyelid '+str(sign),'34221B',.82);eye_dark=mat('Khloe eye interior '+str(sign),'160F0B',.8);iris=mat('Khloe warm brown iris '+str(sign),'513620',.8);pupil=mat('Khloe pupil '+str(sign),'080808',.9);shine=mat('Khloe catchlight '+str(sign),'D9CFB9',.9)
 for material in [eye_dark,iris,pupil,shine]:material.node_tree.nodes.get('Principled BSDF').inputs['Specular IOR Level'].default_value=0
 def point(u,v,s=1,offset=.0005):
  guess=center+horizontal*(u*.021*s)+up*((v*.017+sign*u*.0018)*s)
  hit,pos,n,_=body.ray_cast(Vector((guess.x,-1,guess.z)),Vector((0,1,0)))
  return (pos+Vector((0,-offset,0))) if hit else guess
 # A finely tessellated single eye shell follows every low-poly cheek fold.
 # Shared boundaries prevent iris layering artifacts; short radial spans stop
 # the broader aperture from bridging through the skin at its inner corner.
 N=48;verts=[];rings=[(.02928,.0183,1.0,0),(.02562,.01525,1.0,0)]
 for i in range(1,7):
  t=i/6;rings.append((.02562+(.01156-.02562)*t,.01525+(.01156-.01525)*t,1-t,1))
 for i in range(1,5):
  t=i/4;r=.01156+(.0051-.01156)*t;rings.append((r,r,0,2))
 for i in range(1,4):
  r=.0051*(1-i*.22);rings.append((r,r,0,3))
 def fitted(q,offset):
  hit,pos,n,_=body.ray_cast(Vector((q.x,-1,q.z)),Vector((0,1,0)))
  return pos+Vector((0,-offset,0)) if hit else q
 for rx,rz,almond,material in rings:
  inset=1-(rx/.02928+rz/.0183)*.5
  clearance=.0028+.0004*min(1,inset*6)
  for i in range(N):
   a=i*math.tau/N;cs=math.cos(a);sn=math.sin(a);x=rx*cs;z=rz*sn*(1-.32*almond+.32*almond*abs(sn))
   verts.append(fitted(center+horizontal*x+up*(z+sign*x*.07),clearance))
 verts.append(fitted(center,.0032));faces=[];materials=[]
 for ring in range(len(rings)-1):
  for i in range(N):faces.append((ring*N+i,ring*N+(i+1)%N,(ring+1)*N+(i+1)%N,(ring+1)*N+i));materials.append(rings[ring+1][3])
 for i in range(N):faces.append(((len(rings)-1)*N+i,(len(rings)-1)*N+(i+1)%N,len(rings)*N));materials.append(3)
 o=surface('Khloe fitted almond eye '+str(sign),verts,faces,eyelid)
 for m in [eye_dark,iris,pupil]:o.data.materials.append(m)
 for poly,mi in zip(o.data.polygons,materials):poly.material_index=mi
 c=center+horizontal*(-.0028)+up*.0043;glint=[fitted(c,.0043)]
 for i in range(12):glint.append(fitted(c+horizontal*(.00125*math.cos(i*math.tau/12))+up*(.00125*math.sin(i*math.tau/12)),.0043))
 surface('Khloe tiny catchlight '+str(sign),glint,[(0,i+1,(i+1)%12+1) for i in range(12)],shine)
# Close-fitting leather collar follows the continuous neck surface.
from mathutils.kdtree import KDTree
kd=KDTree(len(body.data.vertices))
for v in body.data.vertices:kd.insert(v.co,v.index)
kd.balance()
def fitted_object(name,verts,faces,material):
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);o.data.materials.append(material);o.parent=arm
 for v in o.data.vertices:
  _,i,_=kd.find(v.co)
  for g in body.data.vertices[i].groups:
   gn=body.vertex_groups[g.group].name;vg=o.vertex_groups.get(gn) or o.vertex_groups.new(name=gn);vg.add([v.index],g.weight,'REPLACE')
 mod=o.modifiers.new('Follow the neck','ARMATURE');mod.object=arm;return o
axis=Vector((0,-.57,.822)).normalized();across=Vector((1,0,0));depth=axis.cross(across);collar_center=Vector((0,-.429,.62));verts=[];N=48
for level,lift in [(-.012,.002),(-.009,.005),(.009,.005),(.012,.002)]:
 for i in range(N):
  rad=across*math.cos(i*math.tau/N)+depth*math.sin(i*math.tau/N);origin=collar_center+axis*level+rad*.30;hit,pos,normal,_=body.ray_cast(origin,-rad)
  if not hit:raise RuntimeError('Collar fit missed body')
  verts.append(pos+rad*lift)
faces=[(j*N+i,j*N+(i+1)%N,(j+1)*N+(i+1)%N,(j+1)*N+i) for j in range(3) for i in range(N)]
fitted_object('Khloe rose leather collar',verts,faces,mat('Khloe rose leather','C97783',.72))
# Small brass tag lies against the front collar, not floating below it.
tag_center=Vector(verts[N+int(N*.75)])+Vector((0,-.006,-.016));tagverts=[]
for i in range(16):tagverts.append(tag_center+Vector((math.cos(i*math.tau/16)*.011,-.0005,math.sin(i*math.tau/16)*.011)))
tagverts.append(tag_center+Vector((0,-.002,0)));tag=fitted_object('Khloe little brass tag',tagverts,[(16,i,(i+1)%16) for i in range(16)],mat('Khloe warm brass','B99A5C',.4))
# Small nostril insets distinguish the nose leather from the dark muzzle.
for sign in [-1,1]:
 coords=[];center=Vector((sign*.0225,-1,.727))
 for i in range(12):
  a=i*math.tau/12;q=center+Vector((math.cos(a)*.0043,0,math.sin(a)*.0025));hit,pos,n,_=body.ray_cast(q,Vector((0,1,0)))
  coords.append(pos+Vector((0,-.0012,0)))
 fitted_object('Khloe nose nostril '+str(sign),coords,[tuple(range(12))],mat('Khloe nostril shade','08090A',.91))

# Subtle separations on the top of the compact paws, authored against the skin.
toe_vertices=[];toe_faces=[]
foot_centers=[]
for side in [-1,1]:
 for front in [True,False]:
  points=[v.co for v in body.data.vertices if v.co.z<.06 and v.co.x*side>0 and (v.co.y<0)==front]
  x_center=(min(p.x for p in points)+max(p.x for p in points))/2
  y_min=min(p.y for p in points);y_max=max(p.y for p in points)
  foot_centers.append((x_center,y_min+(y_max-y_min)*.34))
for x_center,y_center in foot_centers:
 for x_offset in [-.010,.010]:
  start=len(toe_vertices)
  for y_offset in [-.012,-.005,.005,.012]:
   for edge in [-.00075,.00075]:
    origin=Vector((x_center+x_offset+edge,y_center+y_offset,.16));hit,pos,n,_=body.ray_cast(origin,Vector((0,0,-1)))
    if not hit:raise RuntimeError('Paw crease missed skin '+str(tuple(origin)))
    toe_vertices.append(pos+Vector((0,0,.0007)))
  toe_faces.extend((start+2*i,start+2*i+1,start+2*i+3,start+2*i+2) for i in range(3))
fitted_object('Khloe soft toe creases',toe_vertices,toe_faces,mat('Khloe toe fold','89623F',.95))
# Transfer weights from the exact skin triangle below each detail. Interpolated
# weights keep the inset eyes, nose, collar and toe details glued to the coat
# through the neck/head/ear and ankle blends in every authored animation.
from mathutils.bvhtree import BVHTree
body.data.calc_loop_triangles()
triangles=[tuple(t.vertices) for t in body.data.loop_triangles]
bvh=BVHTree.FromPolygons([v.co for v in body.data.vertices],triangles,all_triangles=True)
for ob in list(bpy.data.objects):
 if ob.type!='MESH' or ob==body:continue
 ob.vertex_groups.clear()
 for vertex in ob.data.vertices:
  pos,normal,ti,distance=bvh.find_nearest(vertex.co)
  indices=triangles[ti];a,b,c=[body.data.vertices[i].co for i in indices]
  e0=b-a;e1=c-a;q=pos-a;d00=e0.dot(e0);d01=e0.dot(e1);d11=e1.dot(e1);d20=q.dot(e0);d21=q.dot(e1);den=d00*d11-d01*d01
  if abs(den)<1e-14:weights=(1,0,0)
  else:
   v=(d11*d20-d01*d21)/den;w=(d00*d21-d01*d20)/den;weights=(1-v-w,v,w)
  influences={}
  for vi,weight in zip(indices,weights):
   for group in body.data.vertices[vi].groups:
    name=body.vertex_groups[group.group].name;influences[name]=influences.get(name,0)+max(0,weight)*group.weight
  total=sum(influences.values())
  for name,weight in influences.items():
   if weight>1e-5:
    group=ob.vertex_groups.get(name) or ob.vertex_groups.new(name=name);group.add([vertex.index],weight/total,'REPLACE')
# Neutral canonical meters, matching the site's front -Y / glTF +Z contract.
arm.name='KhloeArmature';arm.data.name='KhloeSkeleton';body.name='KhloeCoat';body.data.name='KhloeContinuousCoat'
for ob in list(bpy.data.objects):
 if ob.type=='MESH':
  if not ob.name.startswith('Khloe'):ob.name='Khloe'+ob.name
  ob['khloeCharacter']=True
  for vertex in ob.data.vertices:vertex.co*=.95
  ob.data.update()
bpy.context.view_layer.objects.active=arm
bpy.ops.object.mode_set(mode='EDIT')
for bone in arm.data.edit_bones:bone.head*=.95;bone.tail*=.95
bpy.ops.object.mode_set(mode='OBJECT')
root=bpy.data.objects.new('Khloe',None);bpy.context.collection.objects.link(root)
for ob in list(bpy.data.objects):
 if ob!=root and ob.parent is None:ob.parent=root
root['character']='Khloe';root['species']='German Shepherd';root['sourceLicense']='CC0-1.0'
from animate_khloe import author_animations
author_animations(arm,root)
for action in list(bpy.data.actions):
 if not action.name.startswith('Khloe'):bpy.data.actions.remove(action)
# Do not keep the source atlas: all shipped colors are authored palette materials.
for material in list(bpy.data.materials):
 if material.users==0:bpy.data.materials.remove(material)
for image in list(bpy.data.images):
 if image.users==0:bpy.data.images.remove(image)
bpy.context.scene.render.fps=30
bpy.context.scene.frame_set(0);bpy.context.view_layer.update()
bpy.ops.wm.save_as_mainfile(filepath=str(HERE/'khloe.blend'),compress=True)
print('KHLOE_BUILD',json.dumps({'meshes':sum(o.type=='MESH' for o in bpy.data.objects),'vertices':sum(len(o.data.vertices) for o in bpy.data.objects if o.type=='MESH'),'actions':[a.name for a in bpy.data.actions],'source':str(HERE/'khloe.blend')}),flush=True)
