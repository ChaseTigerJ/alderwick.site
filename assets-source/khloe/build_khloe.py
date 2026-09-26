"""DreamNoms's CC-BY German Shepherd with visible, skin-bound expressive brows.
No added eyes, collar or tag. Preserve the source mesh, rig and performances.
Run with Blender --background --python assets-source/khloe/build_khloe.py.
"""
from pathlib import Path
import math
import bpy
from mathutils import Vector, Matrix, Quaternion
from mathutils.bvhtree import BVHTree
from mathutils.geometry import barycentric_transform

HERE = Path(__file__).resolve().parent
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.fps = 30
bpy.ops.import_scene.gltf(filepath=str(HERE/'vendor/dreamnoms/scene.gltf'))
rig = bpy.data.objects['metarig']
source_root = bpy.data.objects['Sketchfab_model']
for ob in list(bpy.data.objects):
    if ob.type == 'MESH' and ob.parent is None:
        bpy.data.objects.remove(ob, do_unlink=True)
    elif ob.name.startswith('Lamp') or ob.name == 'Cube':
        bpy.data.objects.remove(ob, do_unlink=True)
for track in list(rig.animation_data.nla_tracks):
    rig.animation_data.nla_tracks.remove(track)
originals = {action.name: action for action in bpy.data.actions}
rig.animation_data.action = originals['Idle1']
scene.frame_set(0)
bpy.context.view_layer.update()

for ob in list(bpy.data.objects):
    if not ob.name.startswith('Khloe'):ob.name='Khloe'+ob.name
    ob['khloeCharacter']=True
    if ob.type=='MESH':
        for face in ob.data.polygons:face.use_smooth=False
rig.name='KhloeArmature'
for mat in bpy.data.materials:
    if not mat.name.startswith('Khloe'):mat.name='KhloeSource_'+mat.name

# A shared deformation field lifts the forehead beneath the visible brow marks.
# Material boundaries move together, keeping the original face seams closed.
brow_meshes=[ob for ob in bpy.data.objects if ob.type=='MESH']
rig_inverse=rig.matrix_world.inverted()
skin_matrices={bone.name:bone.matrix@bone.bone.matrix_local.inverted() for bone in rig.pose.bones}
depsgraph=bpy.context.evaluated_depsgraph_get()
for ob in brow_meshes:
    evaluated=ob.evaluated_get(depsgraph);mesh=evaluated.to_mesh()
    posed=[evaluated.matrix_world@v.co for v in mesh.vertices]
    evaluated.to_mesh_clear()
    ob.shape_key_add(name='Basis')
    ob.data.shape_keys.name=ob.name+'BrowShapes'
    for side,label in [(-1,'Left'),(1,'Right')]:
        key=ob.shape_key_add(name='KhloeBrow'+label)
        for vertex,point in zip(ob.data.vertices,posed):
            x,y,z=point
            influence=max(0,1-((x-side*1.4)/1.65)**2)*max(0,1-((y+6.6)/1.8)**2)*max(0,1-((z-12.2)/1.15)**2)
            if influence<=0:continue
            weights={ob.vertex_groups[g.group].name:g.weight for g in vertex.groups}
            total=sum(weights.values())
            blend=Matrix(((0,0,0,0),)*4)
            for name,weight in weights.items():blend+=skin_matrices[name]*(weight/total)
            to_world=rig.matrix_world@blend@rig_inverse@ob.matrix_world
            # The full expression lifts the forehead by up to 4.8 cm at canonical scale.
            delta=to_world.inverted().to_3x3()@Vector((side*.025,-.035,.85))*influence
            key.data[vertex.index].co=vertex.co+delta
        key.value=0

# Broad, tapered charcoal brows follow the actual forehead triangles and their
# skin weights. Their shape keys inherit the face's deformations, so a curious
# lift moves the markings and fur together instead of floating off the head.
face_vertices,face_triangles,face_weights=[],[],[]
face_deltas={'Left':[],'Right':[]}
for ob in brow_meshes:
    evaluated=ob.evaluated_get(depsgraph);mesh=evaluated.to_mesh()
    mesh.calc_loop_triangles();start=len(face_vertices)
    face_vertices.extend(evaluated.matrix_world@v.co for v in mesh.vertices)
    face_triangles.extend(tuple(start+i for i in tri.vertices) for tri in mesh.loop_triangles)
    for vertex in ob.data.vertices:
        weights={ob.vertex_groups[g.group].name:g.weight for g in vertex.groups}
        face_weights.append(weights)
        blend=Matrix(((0,0,0,0),)*4)
        for name,weight in weights.items():blend+=skin_matrices[name]*weight
        to_world=(rig.matrix_world@blend@rig_inverse@ob.matrix_world).to_3x3()
        for label in face_deltas:
            delta=ob.data.shape_keys.key_blocks['KhloeBrow'+label].data[vertex.index].co-vertex.co
            face_deltas[label].append(to_world@delta)
    evaluated.to_mesh_clear()
face_surface=BVHTree.FromPolygons(face_vertices,face_triangles,all_triangles=True)
ink=bpy.data.materials.new('KhloeBrowCharcoal');ink.use_nodes=True
srgb=(0x36/255,0x3b/255,0x30/255)
color=tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in srgb)
ink.diffuse_color=(*color,1)
principled=ink.node_tree.nodes['Principled BSDF']
principled.inputs['Base Color'].default_value=(*color,1)
principled.inputs['Roughness'].default_value=.86
principled.inputs['Specular IOR Level'].default_value=0

def fitted_brow(side):
    positions,weights,faces=[],[],[]
    shapes={'Left':[],'Right':[]}
    columns,rows=12,3
    for col in range(columns+1):
        u=col/columns
        x=side*(.55+1.55*u)
        center_z=12.0+.12*math.sin(math.pi*u)-.13*u
        thickness=.16+.16*math.sin(math.pi*u)
        for row in range(rows+1):
            z=center_z+thickness*(row/rows-.5)
            point,normal,index,_=face_surface.ray_cast(Vector((x,-25,z)),Vector((0,1,0)))
            assert point is not None and point.y < -5, 'Brow must stay on the forehead'
            triangle=face_triangles[index]
            bary=barycentric_transform(point,*(face_vertices[i] for i in triangle),Vector((1,0,0)),Vector((0,1,0)),Vector((0,0,1)))
            weight={}
            for vertex,amount in zip(triangle,bary):
                for name,value in face_weights[vertex].items():weight[name]=weight.get(name,0)+max(0,amount)*value
            weight=dict(sorted(weight.items(),key=lambda pair:pair[1],reverse=True)[:4])
            total=sum(weight.values());weight={name:value/total for name,value in weight.items()}
            blend=Matrix(((0,0,0,0),)*4)
            for name,value in weight.items():blend+=skin_matrices[name]*value
            to_bind=blend.inverted()@rig_inverse
            if normal.y>0:normal.negate()
            # Less than 2 mm clearance on the island; no projecting brow blocks.
            surface=point+normal*.035
            positions.append(to_bind@surface);weights.append(weight)
            for label in shapes:
                delta=sum((face_deltas[label][vertex]*amount for vertex,amount in zip(triangle,bary)),Vector())
                shapes[label].append(to_bind@(surface+delta))
    for col in range(columns):
        for row in range(rows):
            a=col*(rows+1)+row;b=a+rows+1
            faces.extend([(a,b,b+1),(a,b+1,a+1)])
    label='Left' if side<0 else 'Right'
    mesh=bpy.data.meshes.new('KhloeBrow'+label+'Mesh');mesh.from_pydata(positions,[],faces);mesh.update()
    ob=bpy.data.objects.new('KhloeBrow'+label+'Mark',mesh);scene.collection.objects.link(ob);ob.parent=rig
    mesh.materials.append(ink)
    groups={name:ob.vertex_groups.new(name=name) for name in sorted({name for weight in weights for name in weight})}
    for i,weight in enumerate(weights):
        for name,value in weight.items():groups[name].add([i],value,'REPLACE')
    modifier=ob.modifiers.new('Khloe brow skin','ARMATURE');modifier.object=rig
    ob['khloeCharacter']=True;ob['faceFittedBrow']=True
    ob.shape_key_add(name='Basis');ob.data.shape_keys.name=ob.name+'Shapes'
    for name,positions in shapes.items():
        key=ob.shape_key_add(name='KhloeBrow'+name)
        for vertex,position in zip(key.data,positions):vertex.co=position
        key.value=0
    return ob
brow_meshes.extend(fitted_brow(side) for side in (-1,1))

root=bpy.data.objects.new('Khloe',None);scene.collection.objects.link(root)
normalizer=bpy.data.objects.new('KhloeScale',None);scene.collection.objects.link(normalizer)
normalizer.parent=root;source_root.parent=normalizer
normalizer.scale=(.056,.056,.056);normalizer.location=(0,-.14,.028)
root['source']='DreamNoms — Stylized Low Poly German Shepherd, CC BY 4.0'
# The runtime uses this for pawprints, walking speed and interaction placement.
root['locomotionScale']=.6


def sample(source_name, fraction):
    action=originals[source_name];rig.animation_data.action=action
    lo,hi=action.frame_range
    frame=lo+(hi-lo)*max(0,min(1,fraction))
    scene.frame_set(int(frame),subframe=frame-int(frame));bpy.context.view_layer.update()
    return {b.name:(b.location.copy(),b.rotation_quaternion.copy(),b.scale.copy()) for b in rig.pose.bones}


def pulse(t,start,end):
    if t<=start or t>=end:return 0
    return math.sin(math.pi*(t-start)/(end-start))**2


def brow_pose(name,t,duration):
    phase=t/duration
    if name=='KhloeWalk':return (.12*math.sin(math.pi*phase)**2,)*2
    if name=='KhloeSniff':return (pulse(t,.1,1.15),.38*pulse(t,.45,1.25))
    if name=='KhloeSitCurious':return (.75+.20*math.sin(2*math.pi*phase),.16+.10*math.sin(2*math.pi*phase))
    if name=='KhloePlay':return (pulse(t,.15,1.1)+.7*pulse(t,3.6,4.7),.65*pulse(t,.3,1.1)+pulse(t,3.8,4.7))
    return (.3*math.sin(math.pi*phase)**2,.18*math.sin(math.pi*phase)**2)


# Shared multi-slot actions keep brow morphs and the original skeleton in one
# runtime clip, using the same crossfades, pause and reduced-motion clock.
def bake(name,duration,picker,tilt=False):
    samples=[]
    for frame in range(round(duration*30)+1):
        t=frame/30
        source,fraction=picker(t,duration)
        pose=sample(source,fraction)
        if tilt:
            key='spine.011_metarig';loc,rot,scale=pose[key]
            pose[key]=(loc,rot@Quaternion((0,1,0),math.radians(-12)),scale)
        samples.append(pose)
    action=bpy.data.actions.new(name);rig.animation_data.action=action
    for frame,pose in enumerate(samples):
        for bone in rig.pose.bones:
            bone.rotation_mode='QUATERNION'
            bone.location,bone.rotation_quaternion,bone.scale=pose[bone.name]
            for prop in ('location','rotation_quaternion','scale'):
                bone.keyframe_insert(data_path=prop,frame=frame,group=bone.name)
    for ob in brow_meshes:
        keys=ob.data.shape_keys;keys.animation_data_create()
        slot=action.slots.new(id_type='KEY',name=keys.name)
        keys.animation_data.action=action;keys.animation_data.action_slot=slot
        for frame in range(len(samples)):
            for key,value in zip(['KhloeBrowLeft','KhloeBrowRight'],brow_pose(name,frame/30,duration)):
                block=keys.key_blocks[key];block.value=value;block.keyframe_insert(data_path='value',frame=frame)
    action.use_fake_user=True
    return action

bake('KhloeIdle',1,lambda t,d:('Idle1',t/d))
bake('KhloeWalk',1.6,lambda t,d:('WalkCycle',t/d))
bake('KhloeSniff',1.3,lambda t,d:('IdleEarTwitch',t/d))
def play(t,d):
    if t<1.1:return 'SitDown',t/1.1
    if t<3.6:return 'SitScratchEar',(t-1.1)/2.5
    return 'StandUp',(t-3.6)/1.1
bake('KhloePlay',4.7,play)
bake('KhloeSitCurious',1.2,lambda t,d:('IdleSit',t/d),tilt=True)
for old_name,action in originals.items():
    action.name='DreamNoms_'+old_name;action.use_fake_user=True
idle=bpy.data.actions['KhloeIdle'];rig.animation_data.action=idle
for ob in brow_meshes:
    keys=ob.data.shape_keys;keys.animation_data.action=idle
    keys.animation_data.action_slot=next(slot for slot in idle.slots if slot.target_id_type=='KEY' and slot.name_display==keys.name)
    # The glTF exporter discovers non-active shape-key actions through NLA.
    # Stash each expression without layering it over the preview's idle pose.
    for action in bpy.data.actions:
        if not action.name.startswith('Khloe') or action==idle:continue
        track=keys.animation_data.nla_tracks.new();track.name=action.name;track.mute=True
        strip=track.strips.new(action.name,0,action)
        strip.action_slot=next(slot for slot in action.slots if slot.target_id_type=='KEY' and slot.name_display==keys.name)
scene.frame_set(0);scene.frame_start=0;scene.frame_end=141
bpy.context.view_layer.update()
bpy.ops.wm.save_as_mainfile(filepath=str(HERE/'khloe.blend'))
print('KHLOE: visible skin-bound brows; expressive lifts; five shared runtime clips')
