"""Adapt DreamNoms's CC-BY German Shepherd without changing its original anatomy.
Original mesh/rig/12 performances are vendored; eyes and collar are skin-bound.
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

# Fit each eye to the actual posed face. The source's forehead includes ear
# weights, so assigning the eyes only to the head causes visible separation.
# Sample the coat triangles and transfer their blended weights to every vertex.
face_vertices, face_triangles, face_weights = [], [], []
depsgraph=bpy.context.evaluated_depsgraph_get()
for ob in list(bpy.data.objects):
    if ob.type != 'MESH':continue
    evaluated=ob.evaluated_get(depsgraph);mesh=evaluated.to_mesh()
    mesh.calc_loop_triangles();start=len(face_vertices)
    face_vertices.extend(evaluated.matrix_world@v.co for v in mesh.vertices)
    face_triangles.extend(tuple(start+i for i in triangle.vertices) for triangle in mesh.loop_triangles)
    face_weights.extend({ob.vertex_groups[g.group].name:g.weight for g in v.groups} for v in ob.data.vertices)
    evaluated.to_mesh_clear()
face_surface=BVHTree.FromPolygons(face_vertices,face_triangles,all_triangles=True)
rig_inverse=rig.matrix_world.inverted()
skin_matrices={bone.name:bone.matrix@bone.bone.matrix_local.inverted() for bone in rig.pose.bones}

def on_face(x,z,lift):
    point,normal,index,_=face_surface.ray_cast(Vector((x,-25,z)),Vector((0,1,0)))
    assert point is not None and point.y < -6, 'Eye escaped the front cheek surface'
    triangle=face_triangles[index]
    bary=barycentric_transform(point,*(face_vertices[i] for i in triangle),Vector((1,0,0)),Vector((0,1,0)),Vector((0,0,1)))
    weights={}
    for vertex,amount in zip(triangle,bary):
        for name,weight in face_weights[vertex].items():weights[name]=weights.get(name,0)+max(0,amount)*weight
    # Four influences are the shipping glTF contract. Invert this same blend
    # when finding the bind-space position, rather than one approximate bone.
    weights=dict(sorted(weights.items(),key=lambda item:item[1],reverse=True)[:4])
    total=sum(weights.values());weights={name:value/total for name,value in weights.items()}
    blend=Matrix(((0,0,0,0),)*4)
    for name,weight in weights.items():blend+=skin_matrices[name]*weight
    if normal.y>0:normal.negate()
    return blend.inverted() @ rig_inverse @ (point+normal*lift),weights

def fitted_eye(side):
    center=Vector((side*1.42,11.66))
    # One continuous eye surface with colored rings: no overlapping eyeball,
    # iris and pupil shells that can intersect when the forehead deforms.
    bands=[((0,0),pupil),((.27,.34),pupil),((.455,.475),amber),((.55,.515),cream),((.62,.58),ink)]
    rings=[(Vector((0,0)),0)]
    for band in range(1,len(bands)):
        for step in range(1,5):
            radius=Vector(bands[band-1][0]).lerp(Vector(bands[band][0]),step/4)
            rings.append((radius,band-1))
    materials=[pupil,amber,cream,ink]
    positions,weights,faces,face_materials=[],[],[],[]
    segments=32
    def point(u,v):
        x,z=center+Vector((u,v))
        radial=(u/.62)**2+(v/.58)**2
        lift=.025+.19*max(0,1-radial)
        position,weight=on_face(x,z,lift)
        positions.append(position);weights.append(weight)
    point(0,0)
    for radius,_ in rings[1:]:
        for segment in range(segments):
            angle=2*math.pi*segment/segments
            point(math.cos(angle)*radius.x,math.sin(angle)*radius.y)
    for segment in range(segments):
        faces.append((0,1+segment,1+(segment+1)%segments));face_materials.append(0)
    for ring in range(len(rings)-2):
        inner=1+ring*segments;outer=inner+segments
        for segment in range(segments):
            nxt=(segment+1)%segments
            faces.extend([(inner+segment,outer+segment,outer+nxt),(inner+segment,outer+nxt,inner+nxt)])
            face_materials.extend([rings[ring+2][1]]*2)
    # An inlaid glint shares the same surface; classify a small patch of pupil
    # faces instead of adding another floating piece of geometry.
    materials.append(glint)
    for i,face in enumerate(faces):
        if face_materials[i] != 0:continue
        # Reconstruct patch coordinates from their ring/segment positions.
        coords=[]
        for vertex in face:
            if vertex==0:coords.append(Vector((0,0)));continue
            ring=(vertex-1)//segments+1;angle=2*math.pi*((vertex-1)%segments)/segments
            radius=rings[ring][0];coords.append(Vector((math.cos(angle)*radius.x,math.sin(angle)*radius.y)))
        midpoint=sum(coords,Vector((0,0)))/3
        if ((midpoint.x+.11)/.09)**2+((midpoint.y-.15)/.105)**2<1:face_materials[i]=4
    mesh=bpy.data.meshes.new('KhloeFittedEyeMesh');mesh.from_pydata(positions,[],faces);mesh.update()
    ob=bpy.data.objects.new('KhloeEyeSocket'+('Left' if side<0 else 'Right'),mesh);scene.collection.objects.link(ob);ob.parent=rig
    groups={name:ob.vertex_groups.new(name=name) for name in sorted({name for weight in weights for name in weight})}
    for vertex,weight in enumerate(weights):
        for bone,amount in weight.items():groups[bone].add([vertex],amount,'REPLACE')
    modifier=ob.modifiers.new('Khloe face skin','ARMATURE');modifier.object=rig
    for mat in materials:mesh.materials.append(mat)
    for face,index in zip(mesh.polygons,face_materials):face.material_index=index;face.use_smooth=True
    ob['faceFittedEye']=True
    return ob
for side in (-1,1):fitted_eye(side)
bpy.ops.mesh.primitive_torus_add(major_segments=16,minor_segments=6,major_radius=2.18,minor_radius=.29,location=(0,-2.75,8.00),rotation=(math.pi/2,0,0))
collar=bpy.context.object;collar.name='KhloePinkCollar';collar.data.materials.append(pink);bind(collar,'spine.009_metarig')
bpy.ops.mesh.primitive_uv_sphere_add(segments=8,ring_count=4,location=(0,-3.05,5.69))
tag=bpy.context.object;tag.name='KhloeBrassTag';tag.scale=(.39,.13,.42);tag.data.materials.append(gold);bind(tag,'spine.009_metarig')

for ob in list(bpy.data.objects):
    if not ob.name.startswith('Khloe'):ob.name='Khloe'+ob.name
    ob['khloeCharacter']=True
    if ob.type=='MESH':
        for face in ob.data.polygons:face.use_smooth=bool(ob.get('faceFittedEye'))
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
