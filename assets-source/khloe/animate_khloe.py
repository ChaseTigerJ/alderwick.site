"""Bake Khloe's friendly character clips from the adapted Quaternius skeleton.

Call author_animations(armature, root=None) after canonical mesh/rig shaping.
The rig keeps original source bone names; the external root remains unanimated.
"""
import bpy
import math
from mathutils import Matrix, Quaternion, Vector

FPS = 30

def author_animations(armature, root=None):
    scene = bpy.context.scene
    scene.render.fps = FPS
    armature.data.pose_position = 'POSE'
    armature.animation_data_create()
    for track in list(armature.animation_data.nla_tracks):
        armature.animation_data.nla_tracks.remove(track)
    bones = list(armature.pose.bones)
    scale = armature.data.bones['Head'].head_local.z / .7620777487754822
    sources = {name: bpy.data.actions.get(name) for name in ('Idle', 'Walk', 'Eating', 'Idle_2')}
    if any(action is None for action in sources.values()):
        raise RuntimeError('Khloe requires the original Idle, Walk, Eating and Idle_2 source clips')

    def sampled(name, frame):
        armature.animation_data.action = sources[name]
        scene.frame_set(math.floor(frame), subframe=frame % 1)
        bpy.context.view_layer.update()
        result = {}
        for bone in bones:
            loc, rot, size = bone.matrix_basis.decompose()
            result[bone.name] = Matrix.LocRotScale(loc * scale, rot, size)
        return result

    rest = {bone.name: Matrix.Identity(4) for bone in bones}
    sitting = sampled('Idle_2', 16)
    sniff_low = sampled('Eating', 18)
    walk_duration = 2.2
    specifications = [('KhloeIdle', 4), ('KhloeWalk', walk_duration), ('KhloeSniff', 3.2), ('KhloePlay', 4.7), ('KhloeSitCurious', 4)]
    samples = {}
    for name, duration in specifications:
        end = round(duration * FPS)
        frames = sorted(set(range(0, end + 1, 2)) | {end})
        samples[name] = []
        for frame in frames:
            t = frame / FPS
            if name == 'KhloeWalk':
                base = sampled('Walk', t / duration * sources['Walk'].frame_range[1])
            else:
                base = {key: value.copy() for key, value in rest.items()}
            samples[name].append((frame, t, base))
    armature.animation_data.action = None
    for bone in bones:
        bone.rotation_mode = 'QUATERNION'
    tail_names = ['Tail1', 'Tail2', 'Tail3', 'Tail3.001', 'Tail3.002', 'Tail3.003']

    def blend_pose(a, b, amount):
        return {name: a[name].lerp(b[name], amount) for name in a}

    def global_rotate(name, axis, angle):
        bone = armature.pose.bones[name]
        matrix = bone.matrix.copy()
        position = matrix.translation.copy()
        bone.matrix = Matrix.Translation(position) @ Matrix.Rotation(angle, 4, axis) @ Matrix.Translation(-position) @ matrix
        bpy.context.view_layer.update()

    def tail_wag(t, strength=.12, rate=1):
        for index, name in enumerate(tail_names):
            bone = armature.pose.bones[name]
            bone.matrix_basis = Matrix.Identity(4)
        bpy.context.view_layer.update()
        global_rotate('Tail1', 'Z', math.sin(t * math.tau * rate) * strength)
        global_rotate('Tail3', 'Z', math.sin(t * math.tau * rate - .7) * strength * .45)

    def settle_haunches():
        # Keep the shoulders/front paws planted while the pelvis settles down.
        saved = {name: armature.pose.bones[name].matrix.copy() for name in ['Torso2', 'BackUpperLeg.L', 'BackUpperLeg.R', 'BackLowerLeg.L', 'BackLowerLeg.R']}
        back = armature.pose.bones['Back']
        m = back.matrix.copy(); m.translation += Vector((0,-.04,-.11)) * scale
        back.matrix = m; bpy.context.view_layer.update()
        shoulder = saved['Torso2'].copy(); shoulder.translation.y -= .10 * scale
        armature.pose.bones['Torso2'].matrix = shoulder; bpy.context.view_layer.update()
        for side in ['L','R']:
            for prefix in ['FrontShoulder.', 'FrontUpperLeg.', 'FrontLowerLeg.', 'IKFrontLeg.', 'FF.']:
                bone = armature.pose.bones[prefix + side]
                bone.matrix = bone.bone.matrix_local.copy(); bpy.context.view_layer.update()
        for side in ['L','R']:
            name = 'BackUpperLeg.' + side
            bone = armature.pose.bones[name]
            head = bone.head.copy()
            target = saved['BackLowerLeg.' + side].translation
            original = bone.bone.matrix_local.to_quaternion()
            direction = (target - head).normalized()
            rotation = (original @ Vector((0,1,0))).rotation_difference(direction) @ original
            bone.matrix = Matrix.LocRotScale(head, rotation, Vector((1,1,1)))
            bpy.context.view_layer.update()
            armature.pose.bones['BackLowerLeg.' + side].matrix = saved['BackLowerLeg.' + side]
            bpy.context.view_layer.update()

    def aim_bone(name, head, target):
        bone = armature.pose.bones[name]
        original = bone.bone.matrix_local.to_quaternion()
        direction = (target - head).normalized()
        rotation = (original @ Vector((0,1,0))).rotation_difference(direction) @ original
        bone.matrix = Matrix.LocRotScale(head, rotation, Vector((1,1,1)))
        bpy.context.view_layer.update()

    def play_bow(amount):
        shoulder = armature.pose.bones['Torso2'].matrix.copy()
        armature.pose.bones['Body'].matrix_basis = Matrix.Identity(4)
        armature.pose.bones['Back'].matrix_basis = Matrix.Identity(4)
        bpy.context.view_layer.update()
        shoulder.translation.z -= .13 * scale * amount
        armature.pose.bones['Torso2'].matrix = shoulder
        bpy.context.view_layer.update()
        for side in ['L','R']:
            upper = armature.pose.bones['FrontUpperLeg.' + side]
            lower = armature.pose.bones['FrontLowerLeg.' + side]
            elbow = lower.head.copy().lerp(Vector((upper.head.x, -.39 * scale, .09 * scale)), amount)
            paw = armature.pose.bones['IKFrontLeg.' + side]
            p = paw.matrix.copy(); p.translation.y -= .17 * scale * amount
            paw.matrix = p; bpy.context.view_layer.update()
            aim_bone('FrontUpperLeg.' + side, upper.head.copy(), elbow)
            aim_bone('FrontLowerLeg.' + side, elbow, paw.head.copy())

    def seated_tail(t):
        start = armature.pose.bones['Tail1'].head.copy()
        offsets = [(0,0,0),(.06,.075,-.06),(.12,.105,-.11),(.175,.175,-.155),(.205,.30,-.18),(.17,.41,-.18),(.065,.47,-.17)]
        points = [start + Vector(v) * scale for v in offsets]
        for i in range(1,len(points)):
            points[i].z = max(.045 * scale, points[i].z)
        for index, name in enumerate(tail_names):
            bone = armature.pose.bones[name]
            original = bone.bone.matrix_local.to_quaternion()
            direction = (points[index+1] - points[index]).normalized()
            rotation = (original @ Vector((0,1,0))).rotation_difference(direction) @ original
            bone.matrix = Matrix.LocRotScale(points[index], rotation, Vector((1,1,1)))
            bpy.context.view_layer.update()
        global_rotate('Tail3.002', 'Z', .07 * math.sin(t * math.tau / 4))

    skin = max((obj for obj in bpy.data.objects if obj.type == 'MESH' and any(mod.type == 'ARMATURE' and mod.object == armature for mod in obj.modifiers)), key=lambda obj: len(obj.data.vertices))

    def ground_pose(name):
        # Legacy walk pads and folded hocks can dip a centimeter below their
        # nominal IK roots. Bake one whole-pose correction rather than moving
        # the runtime root or changing individual paw geometry.
        front = {bone.name: bone.matrix.copy() for bone in bones if bone.name.startswith(('FrontShoulder.', 'FrontUpperLeg.', 'FrontLowerLeg.', 'IKFrontLeg.', 'FF.'))} if name == 'KhloeSitCurious' else {}
        evaluated = skin.evaluated_get(bpy.context.evaluated_depsgraph_get())
        to_armature = armature.matrix_world.inverted() @ evaluated.matrix_world
        lowest = min((to_armature @ vertex.co).z for vertex in evaluated.data.vertices)
        lift = .001 * scale - lowest
        for bone in bones:
            if bone.parent is None:
                matrix = bone.matrix.copy(); matrix.translation.z += lift
                bone.matrix = matrix
        bpy.context.view_layer.update()
        # The seated haunches need a tiny lift, but the four foreleg joints were
        # already authored at their grounded standing positions. Keep them there.
        for bone in bones:
            if bone.name in front:
                bone.matrix = front[bone.name]
                bpy.context.view_layer.update()

    actions = []
    for name, duration in specifications:
        old = bpy.data.actions.get(name)
        if old: bpy.data.actions.remove(old)
        action = bpy.data.actions.new(name)
        action.use_fake_user = True
        armature.animation_data.action = action
        for frame, t, base in samples[name]:
            # Clear action evaluation before authoring each pose.
            armature.animation_data.action = None
            scene.frame_set(frame)
            if name == 'KhloeSitCurious':
                base = sitting
            elif name == 'KhloeSniff':
                base = blend_pose(rest, sniff_low, .84 + .06 * math.cos(t * math.tau / duration))
            elif name == 'KhloePlay':
                bow = math.sin(math.pi * min(t / 1.65, 1)) ** 2
                base = blend_pose(rest, sniff_low, bow * .79)
            for bone in bones: bone.matrix_basis = base[bone.name]
            bpy.context.view_layer.update()
            if name == 'KhloeIdle':
                global_rotate('Neck3', 'Y', .025 * math.sin(t * math.tau / duration))
                global_rotate('Torso2', 'X', .012 * math.sin(t * math.tau / duration))
                tail_wag(t, .095, .5)
            elif name == 'KhloeWalk':
                tail_wag(t, .09, 1 / duration)
            elif name == 'KhloeSniff':
                global_rotate('Neck3', 'Z', .06 * math.sin(t * math.tau / duration))
                tail_wag(t, .07, 1 / duration)
            elif name == 'KhloePlay':
                play_bow(math.sin(math.pi * min(t / 1.65, 1)) ** 2)
                envelope = math.sin(math.pi * min(t / duration, 1)) ** 2
                tail_wag(t, .36 * envelope, 2)
                curiosity = math.sin(math.pi * max(0, min((t - 2.3) / 2.4, 1))) ** 2
                global_rotate('Neck3', 'Y', .20 * curiosity)
                # A perk in the ears retains their broad, shared skull attachment.
                for side, sign in [('L',1),('R',-1)]:
                    global_rotate('Ear1.' + side, 'Y', sign * .035 * envelope)
            elif name == 'KhloeSitCurious':
                settle_haunches()
                global_rotate('Neck3', 'X', math.radians(28))
                global_rotate('Neck3', 'Y', math.radians(12.5) + .035 * math.sin(t * math.tau / duration))
                seated_tail(t)
            bpy.context.view_layer.update()
            ground_pose(name)
            armature.animation_data.action = action
            for bone in bones:
                bone.keyframe_insert('location', frame=frame, group=bone.name)
                bone.keyframe_insert('rotation_quaternion', frame=frame, group=bone.name)
                bone.keyframe_insert('scale', frame=frame, group=bone.name)
        for layer in action.layers:
            for strip in layer.strips:
                for bag in strip.channelbags:
                    for curve in bag.fcurves:
                        for key in curve.keyframe_points: key.interpolation = 'LINEAR'
        actions.append(action)
    armature.animation_data.action = actions[0]
    scene.frame_start = 0; scene.frame_end = 120; scene.frame_set(0)
    bpy.context.view_layer.update()
    return actions
