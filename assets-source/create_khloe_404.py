"""Pose the original Alderwick Khloe for the site's transparent 404 illustration.
Run: Blender --background --python assets-source/create_khloe_404.py
Writes /tmp/alderwick-khloe-404.png. Encode the RGBA render with Pillow:
python3 -c "from PIL import Image; Image.open('/tmp/alderwick-khloe-404.png').save('public/images/khloe-404.webp', quality=94, method=6, exact=True)"
Only reads the island source. It never changes the island scene or GLB.
"""
import bpy, math, os
from mathutils import Vector

ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
with bpy.data.libraries.load(os.path.join(ROOT,'assets-source','alderwick-island.blend'),link=False) as (source,target):
 target.objects=[name for name in source.objects if name.startswith('Khloe')]
for ob in target.objects:
 if ob: bpy.context.collection.objects.link(ob)
khloe=bpy.data.objects['Khloe'];khloe.location=(0,0,0);khloe.scale=(1,1,1)
body=bpy.data.objects['KhloeBody'];body.location=(0,.10,.37);body.rotation_euler.x=-.85
head=bpy.data.objects['KhloeHead'];head.location=(0,-.13,.58);head.rotation_euler=(.025,math.radians(-16),math.radians(12))
# Keep her original long muzzle, amber/tan brow markings, erect ears, pink
# collar, slim black saddle and all their original faceted geometry.
for suffix,sign in [('L',-1),('R',1)]:
 front=bpy.data.objects['KhloeLegF'+suffix];front.location=(sign*.113,-.115,.505);front.scale.z=1.41
 # Both long front paws remain firmly planted; a small stagger feels relaxed.
 if sign==1:front.location.y-=.025
# Sitting bends through the hip, stifle and hock, not one rigid leg rotation.
# Replace only the hind-leg pose with the same low-poly material vocabulary.
for name in ['KhloeLegBL','KhloeLegBR','KhloeTail']:
 ob=bpy.data.objects[name]
 for part in list(ob.children_recursive):bpy.data.objects.remove(part,do_unlink=True)
 bpy.data.objects.remove(ob,do_unlink=True)

def ico(name,p,scale,material,sub=1):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub,radius=1,location=p)
 ob=bpy.context.object;ob.name=name;ob.scale=scale;ob.data.materials.append(bpy.data.materials[material]);return ob

def beam(name,a,b,r,material,sides=7):
 a,b=Vector(a),Vector(b);direction=b-a
 bpy.ops.mesh.primitive_cylinder_add(vertices=sides,radius=r,depth=direction.length,location=(a+b)/2)
 ob=bpy.context.object;ob.name=name;ob.rotation_euler=direction.to_track_quat('Z','Y').to_euler();ob.data.materials.append(bpy.data.materials[material]);return ob

for sign in [-1,1]:
 ico('Khloe soft seated shoulder',(sign*.113,-.115-(.025 if sign==1 else 0),.505),(.054,.065,.064),'shepherd_tan',1)
 ico('Khloe seated haunch',(sign*.118,.19,.175),(.085,.138,.165),'shepherd_tan',2)
 ico('Khloe folded stifle',(sign*.169,.08,.13),(.071,.095,.087),'shepherd_gold',1)
 beam('Khloe folded rear hock',(sign*.169,.092,.115),(sign*.19,.015,.055),.040,'shepherd_tan')
 ico('Khloe planted rear paw',(sign*.19,-.023,.031),(.055,.10,.033),'shepherd_gold',1)
# Feathered tail rests around the flank, rather than pointing stiffly upward.
for a,b,r,material in [((0,.265,.18),(.10,.36,.11),.064,'shepherd_sable'),((.10,.36,.11),(.26,.35,.065),.057,'shepherd_sable'),((.26,.35,.065),(.36,.23,.052),.046,'shepherd_black'),((.36,.23,.052),(.355,.12,.051),.030,'shepherd_black')]:
 beam('Khloe resting tail',a,b,r,material)
# A clean transparent cutout lets the page provide its own subtle contact
# shadow without a shadow-catcher rectangle tinting the surrounding design.
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=96;scene.cycles.use_denoising=True
scene.render.film_transparent=True
world=scene.world or bpy.data.worlds.new('Khloe studio');scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.79,.82,.86,1);world.node_tree.nodes['Background'].inputs[1].default_value=.6

def area(name,p,energy,size,color,target):
 bpy.ops.object.light_add(type='AREA',location=p);ob=bpy.context.object;ob.name=name;ob.data.energy=energy;ob.data.shape='DISK';ob.data.size=size;ob.data.color=color;ob.rotation_euler=(Vector(target)-ob.location).to_track_quat('-Z','Y').to_euler()
area('Warm broad studio key',(-2.1,-3.0,4.2),190,3.0,(1,.84,.66),(0,0,.5))
area('Soft front fill',(2,-3,2),100,2.5,(.80,.88,1),(0,0,.55))
area('Ear and saddle rim',(1.8,2.5,3.2),230,2,(1,.91,.73),(0,0,.55))
bpy.ops.object.camera_add(location=(1.0,-3.5,1.65));camera=bpy.context.object;camera.name='Curious Khloe portrait';camera.rotation_euler=(Vector((.095,.02,.415))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=1.40;scene.camera=camera
scene.render.resolution_x=1000;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.filepath='/tmp/alderwick-khloe-404.png'
bpy.ops.render.render(write_still=True)
print('KHLOE_404 /tmp/alderwick-khloe-404.png 1000x1100 transparent RGBA',flush=True)
