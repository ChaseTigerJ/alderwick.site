"""Adapt DreamNoms's CC-BY German Shepherd without changing its original anatomy.
Original mesh/rig/12 performances are vendored; eyes and collar are skin-bound.
Run with Blender --background --python assets-source/khloe/build_khloe.py.
"""
from pathlib import Path
import math
import bpy
from mathutils import Vector, Matrix, Quaternion

HERE = Path(__file__).resolve().parent
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.fps = 30
bpy.ops.import_scene.gltf(filepath=str(HERE/'vendor/dreamnoms/scene.gltf'))
rig = bpy.data.objects['metarig']
source_root = bpy.data.objects['Sketchfab_model']
for ob in list(bpy.data.objects):
    if ob.type == 'MESH' and ob.parent is None:
        bpy.data.objects.remove(ob, do_unlink=True) # importer bone-display helper
    elif ob.name.startswith('Lamp') or ob.name == 'Cube':
        bpy.data.objects.remove(ob, do_unlink=True)
for track in list(rig.animation_data.nla_tracks):
    rig.animation_data.nla_tracks.remove(track)
originals = {action.name: action for action in bpy.data.actions}
rig.animation_data.action = originals['Idle1']
scene.frame_set(0)
bpy.context.view_layer.update()

# Add small details in the original posed world space, then transform every
# vertex back through the head's inverse pose into the existing bind skeleton.
# This makes them real skins, never loose objects attached by approximate pivots.
def material(name, color, roughness=.7):
    mat=bpy.data.materials.new(name);mat.diffuse_color=(*color,1);mat.use_nodes=True
    p=mat.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=roughness
    return mat
ink=material('KhloeEyeRim',(.014,.010,.008))
cream=material('KhloeEyeWhite',(.78,.73,.61))
amber=material('KhloeAmberEyes',(.23,.10,.025),.32)
pupil=material('KhloePupils',(.005,.004,.003),.28)
glint=material('KhloeEyeGlint',(1,.98,.91),.3)
pink=material('KhloeRoseCollar',(.53,.09,.20))
gold=material('KhloeBrassTag',(.53,.32,.09),.45)

def bind(ob, bone_name):
    bpy.context.view_layer.update()
    world=ob.matrix_world.copy(); bone=rig.pose.bones[bone_name]
    to_bind=bone.bone.matrix_local @ bone.matrix.inverted() @ rig.matrix_world.inverted() @ world
    ob.data.transform(to_bind)
    ob.parent=rig;ob.matrix_parent_inverse=Matrix.Identity(4);ob.matrix_basis=Matrix.Identity(4)
    group=ob.vertex_groups.new(name=bone_name);group.add(list(range(len(ob.data.vertices))),1,'REPLACE')
    modifier=ob.modifiers.new('Khloe character skin','ARMATURE');modifier.object=rig
    return ob

def eye_piece(name, center, radius, mat, angle):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,location=center)
    ob=bpy.context.object;ob.name=name;ob.scale=radius;ob.rotation_euler.z=angle
    ob.data.materials.append(mat)
    return bind(ob,'spine.011_metarig')
for side in (-1,1):
    center=Vector((side*1.62,-7.18,12.00));angle=side*.26
    front=Vector((side*math.sin(.26),-math.cos(.26),0))
    eye_piece('KhloeEyeSocket',center,(.86,.20,.87),ink,angle)
    eye_piece('KhloeEyeWhite',center+front*.12,(.73,.15,.74),cream,angle)
    eye_piece('KhloeEyeIris',center+front*.23+Vector((-side*.07,0,-.035)),(.60,.095,.64),amber,angle)
    eye_piece('KhloeEyePupil',center+front*.31+Vector((-side*.07,0,-.035)),(.35,.055,.46),pupil,angle)
    eye_piece('KhloeEyeSpark',center+front*.36+Vector((-.13,0,.22)),(.13,.035,.13),glint,angle)
bpy.ops.mesh.primitive_torus_add(major_segments=16,minor_segments=6,major_radius=2.18,minor_radius=.29,location=(0,-2.75,8.00),rotation=(math.pi/2,0,0))
collar=bpy.context.object;collar.name='KhloePinkCollar';collar.data.materials.append(pink);bind(collar,'spine.009_metarig')
bpy.ops.mesh.primitive_uv_sphere_add(segments=8,ring_count=4,location=(0,-3.05,5.69))
tag=bpy.context.object;tag.name='KhloeBrassTag';tag.scale=(.39,.13,.42);tag.data.materials.append(gold);bind(tag,'spine.009_metarig')

for ob in list(bpy.data.objects):
    if not ob.name.startswith('Khloe'):ob.name='Khloe'+ob.name
    ob['khloeCharacter']=True
    if ob.type=='MESH':
        for face in ob.data.polygons:face.use_smooth=False
rig.name='KhloeArmature'
for mat in bpy.data.materials:
    if not mat.name.startswith('Khloe'):mat.name='KhloeSource_'+mat.name

root=bpy.data.objects.new('Khloe',None);scene.collection.objects.link(root)
normalizer=bpy.data.objects.new('KhloeScale',None);scene.collection.objects.link(normalizer)
normalizer.parent=root;source_root.parent=normalizer
normalizer.scale=(.056,.056,.056)
normalizer.location=(0,-.14,.028)
root['source']='DreamNoms — Stylized Low Poly German Shepherd, CC BY 4.0'

# Bake the original rig transforms into five runtime clips. The click sequence
# simply joins the author's sit, scratch and stand performances, once, in 4.7s.
# Preserve all 12 untouched source performances in the editable Blend as well.
def sample(source_name, fraction):
    action=originals[source_name];rig.animation_data.action=action
    lo,hi=action.frame_range
    frame=lo+(hi-lo)*max(0,min(1,fraction))
    scene.frame_set(int(frame),subframe=frame-int(frame));bpy.context.view_layer.update()
    return {b.name:(b.location.copy(),b.rotation_quaternion.copy(),b.scale.copy()) for b in rig.pose.bones}

def bake(name,duration,picker,tilt=False):
    samples=[]
    for frame in range(round(duration*30)+1):
        t=frame/30
        source,fraction=picker(t,duration)
        pose=sample(source,fraction)
        if tilt:
            key='spine.011_metarig';loc,rot,scale=pose[key]
            # Small inquisitive roll; eyes inherit this exact head transform.
            pose[key]=(loc,rot @ Quaternion((0,1,0),math.radians(-12)),scale)
        samples.append(pose)
    action=bpy.data.actions.new(name);rig.animation_data.action=action
    for frame,pose in enumerate(samples):
        for bone in rig.pose.bones:
            bone.rotation_mode='QUATERNION'
            bone.location,bone.rotation_quaternion,bone.scale=pose[bone.name]
            for prop in ('location','rotation_quaternion','scale'):
                bone.keyframe_insert(data_path=prop,frame=frame,group=bone.name)
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
rig.animation_data.action=bpy.data.actions['KhloeIdle']
scene.frame_set(0);scene.frame_start=0;scene.frame_end=141
bpy.context.view_layer.update()
bpy.ops.wm.save_as_mainfile(filepath=str(HERE/'khloe.blend'))
print('KHLOE: DreamNoms original anatomy and rig; bound eyes and collar; five runtime clips')
