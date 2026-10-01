extends Spatial

# Lightweight Godot 3.6 prototype. The imported GLB supplies the board and its
# 32 numbered spaces; this script supplies a camera, token, HUD, and rules.
const STEP_SECONDS = 0.24
const PROMPTS = {
	"Hip-Hop": "Punchy drums and a confident hook",
	"Latin": "Warm percussion and a dance rhythm",
	"Country": "Storytelling guitar and an open-road chorus",
	"Global": "A cross-cultural melody and layered groove"
}
const PRODUCERS = {3: "Hip-Hop", 11: "Latin", 19: "Country", 27: "Global"}
const STUDIOS = [7, 15, 23, 31]

var route = []
var token = null
var camera = null
var hud = null
var status_label = null
var prompts_label = null
var message_label = null
var roll_button = null

var position_index = 0
var cash = 1000
var collected = {}
var recorded = false
var manager = false
var radio = false
var won = false
var moving = false
var remaining_steps = 0
var step_elapsed = 0.0
var step_start = Vector3.ZERO
var step_target = Vector3.ZERO
var message = "Roll the dice to visit producers in all four districts."

func _ready():
	randomize()
	_make_route()
	_make_camera_and_light()
	_make_token()
	_make_hud()
	get_viewport().connect("size_changed", self, "_resize_camera")
	_resize_camera()
	_refresh_hud()

func _make_route():
	# These are the center coordinates of Space_01 through Space_32 in the GLB.
	for x in [-7.875, -5.625, -3.375, -1.125, 1.125, 3.375, 5.625, 7.875]:
		route.append(Vector3(x, 0.62, -8.65))
	for z in [-7.875, -5.625, -3.375, -1.125, 1.125, 3.375, 5.625, 7.875]:
		route.append(Vector3(8.65, 0.62, z))
	for x in [7.875, 5.625, 3.375, 1.125, -1.125, -3.375, -5.625, -7.875]:
		route.append(Vector3(x, 0.62, 8.65))
	for z in [7.875, 5.625, 3.375, 1.125, -1.125, -3.375, -5.625, -7.875]:
		route.append(Vector3(-8.65, 0.62, z))

func _make_camera_and_light():
	camera = Camera.new()
	camera.name = "BoardCamera"
	add_child(camera)
	camera.projection = Camera.PROJECTION_ORTHOGONAL
	camera.translation = Vector3(0, 26, 27)
	camera.look_at(Vector3(0, 0, 0), Vector3.UP)
	camera.current = true

	var light = DirectionalLight.new()
	light.name = "Sunlight"
	add_child(light)
	light.rotation_degrees = Vector3(-55, -35, 0)
	light.light_energy = 1.15

func _resize_camera():
	var view_size = get_viewport().size
	var aspect = float(view_size.x) / max(1.0, float(view_size.y))
	# A portrait window needs a wider vertical span to fit the square board.
	camera.size = max(26.0, 26.0 / aspect)

func _make_token():
	token = MeshInstance.new()
	token.name = "PlayerMarker"
	var mesh = SphereMesh.new()
	mesh.radius = 0.38
	mesh.height = 0.76
	token.mesh = mesh
	var mat = SpatialMaterial.new()
	mat.albedo_color = Color(1.0, 0.82, 0.12)
	mat.flags_unshaded = true
	token.material_override = mat
	add_child(token)
	token.translation = route[position_index]

func _make_hud():
	var canvas = CanvasLayer.new()
	canvas.name = "ScreenUI"
	add_child(canvas)
	hud = Control.new()
	hud.name = "HUD"
	hud.anchor_right = 1.0
	hud.anchor_bottom = 1.0
	hud.mouse_filter = Control.MOUSE_FILTER_IGNORE
	canvas.add_child(hud)

	var card = PanelContainer.new()
	card.rect_position = Vector2(12, 12)
	card.rect_min_size = Vector2(290, 0)
	var style = StyleBoxFlat.new()
	style.bg_color = Color(0.035, 0.055, 0.12, 0.88)
	style.border_color = Color(0.2, 0.7, 0.95)
	style.set_border_width_all(1)
	style.set_content_margin_all(12)
	card.add_stylebox_override("panel", style)
	hud.add_child(card)

	var stack = VBoxContainer.new()
	card.add_child(stack)
	status_label = _add_label(stack)
	prompts_label = _add_label(stack)
	message_label = _add_label(stack)
	message_label.rect_min_size = Vector2(270, 0)
	message_label.autowrap = true

	roll_button = Button.new()
	roll_button.text = "ROLL DICE"
	roll_button.rect_min_size = Vector2(180, 48)
	roll_button.anchor_left = 0.5
	roll_button.anchor_right = 0.5
	roll_button.anchor_top = 1.0
	roll_button.anchor_bottom = 1.0
	roll_button.margin_left = -90
	roll_button.margin_right = 90
	roll_button.margin_top = -64
	roll_button.margin_bottom = -16
	hud.add_child(roll_button)
	roll_button.connect("pressed", self, "_roll")

func _add_label(parent):
	var label = Label.new()
	label.add_color_override("font_color", Color(0.94, 0.96, 1.0))
	parent.add_child(label)
	return label

func _roll():
	if moving or won:
		return
	var dice = 1 + (randi() % 6)
	message = "Rolled %d. Moving..." % dice
	remaining_steps = dice
	moving = true
	roll_button.disabled = true
	_begin_step()
	_refresh_hud()

func _begin_step():
	step_elapsed = 0.0
	step_start = token.translation
	step_target = route[(position_index + 1) % route.size()]

func _process(delta):
	if not moving:
		return
	step_elapsed += delta
	var t = min(1.0, step_elapsed / STEP_SECONDS)
	var eased = t * t * (3.0 - 2.0 * t)
	token.translation = step_start.linear_interpolate(step_target, eased)
	if t < 1.0:
		return
	position_index = (position_index + 1) % route.size()
	remaining_steps -= 1
	if position_index == 0:
		cash += 200
	if remaining_steps > 0:
		_begin_step()
	else:
		moving = false
		_resolve_space()
		roll_button.disabled = won
	_refresh_hud()

func _resolve_space():
	var space = position_index + 1
	if PRODUCERS.has(space):
		var district = PRODUCERS[space]
		if not collected.has(district):
			collected[district] = PROMPTS[district]
			message = "%s producer: %s" % [district, PROMPTS[district]]
		else:
			message = "%s prompt already collected." % district
	elif space in STUDIOS:
		if recorded:
			message = "Your song is already recorded."
		elif collected.size() < 4:
			message = "Collect all four producer prompts to use a studio."
		elif cash < 500:
			message = "A studio session costs $500. Pass the first space for $200."
		else:
			cash -= 500
			recorded = true
			message = "Song recorded! Find the Manager space next."
	elif space == 5:
		if not recorded:
			message = "Record your song before hiring a manager."
		elif not manager and cash >= 200:
			cash -= 200
			manager = true
			message = "Manager hired! Head to Radio."
		elif manager:
			message = "Your manager is already working."
		else:
			message = "Hiring a manager costs $200."
	elif space == 13:
		if not manager:
			message = "Hire a manager before submitting to Radio."
		elif not radio and cash >= 100:
			cash -= 100
			radio = true
			message = "Your song is on the radio! Reach the Final Venue."
		elif radio:
			message = "Your song is already on the radio."
		else:
			message = "Radio submission costs $100."
	elif space == 21:
		if radio:
			won = true
			message = "Final Venue performance complete! You win!"
		else:
			message = "Get radio play before the Final Venue."
	else:
		message = "Space %02d. Keep building your music career." % space

func _refresh_hud():
	status_label.text = "MUSIC CITY ESTATES\nCash: $%d   Space: %02d / 32" % [cash, position_index + 1]
	var lines = "Producer prompts: %d / 4" % collected.size()
	for district in ["Hip-Hop", "Latin", "Country", "Global"]:
		lines += "\n%s %s" % ["[x]" if collected.has(district) else "[ ]", district]
	lines += "\nSong: %s  Manager: %s  Radio: %s" % ["Yes" if recorded else "No", "Yes" if manager else "No", "Yes" if radio else "No"]
	prompts_label.text = lines
	message_label.text = "\n" + message
	if won:
		roll_button.text = "YOU WIN!"
