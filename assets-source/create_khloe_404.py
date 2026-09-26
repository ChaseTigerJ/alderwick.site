"""Render the same rigged Khloé seen on the island in her curious seated pose.

Run Blender --background --python assets-source/create_khloe_404.py
Then encode /tmp/alderwick-khloe-404.png as public/images/khloe-404.webp
using Pillow (quality=94, method=6, exact=True). No island files are changed.
"""
from pathlib import Path
import bpy
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'assets-source/khloe/khloe.blend'))
scene=bpy.context.scene
scene.render.fps=30
rig=bpy.data.objects['KhloeArmature']
rig.animation_data.action=bpy.data.actions['KhloeSitCurious']
rig.data.pose_position='POSE'
scene.frame_set(21) # 0.7s: grounded sit and 12-degree head tilt.
bpy.context.view_layer.update()
scene.render.engine='CYCLES'
scene.cycles.samples=96
scene.cycles.use_denoising=True
scene.render.film_transparent=True
world=scene.world or bpy.data.worlds.new('Khloe portrait studio')
scene.world=world;world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.66,.65,.61,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.35

def area(name,position,power,size,color):
 bpy.ops.object.light_add(type='AREA',location=position)
 light=bpy.context.object;light.name=name
 light.data.energy=power;light.data.shape='DISK';light.data.size=size;light.data.color=color
 light.rotation_euler=(Vector((0,-.10,.43))-light.location).to_track_quat('-Z','Y').to_euler()

area('Broad warm key',(-2,-3,4),420,3,(1,.94,.86))
area('Gentle face fill',(3,-2,2),220,3,(.91,.96,1))
area('Ear rim',(1,3,3),300,2,(1,.94,.84))
bpy.ops.object.camera_add(location=(.90,-3.0,1.08))
camera=bpy.context.object;camera.name='Khloe curious portrait camera'
camera.rotation_euler=(Vector((.025,-.02,.385))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type='ORTHO';camera.data.ortho_scale=1.145;scene.camera=camera
scene.render.resolution_x=1000;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX';scene.view_settings.exposure=-.48
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
scene.render.filepath='/tmp/alderwick-khloe-404.png'
bpy.ops.render.render(write_still=True)
print('KHLOE_404 /tmp/alderwick-khloe-404.png 1000x1100 transparent RGBA',flush=True)
