-- Import a purchased PNG sheet sprite (src/content/sprites/*.json) into a
-- tagged .aseprite master: one frame per sheet frame, one tag per
-- animation (per direction block for directional strips), durations from
-- the def's fps. Run via scripts/import-sheet-sprites.mjs:
--   aseprite -b --script-param def=<json> --script-param assets=<dir>
--            --script-param out=<file.aseprite> --script <this file>
-- The def JSON is pre-flattened by the mjs wrapper into a simple
-- pipe-delimited plan to keep this script free of a JSON parser:
--   plan=<w>x<h>;<animName>:<image>:<row>:<frames>:<durationMs>:<startX>|...

local params = app.params
local plan = assert(params.plan, "missing --script-param plan=...")
local out = assert(params.out, "missing --script-param out=...")
local assetsDir = assert(params.assets, "missing --script-param assets=...")

local sizePart, entriesPart = plan:match("^([^;]+);(.*)$")
local frameW, frameH = sizePart:match("^(%d+)x(%d+)$")
frameW, frameH = tonumber(frameW), tonumber(frameH)

local sprite = Sprite(frameW, frameH, ColorMode.RGB)
sprite.filename = out

local sheets = {}
local function sheetImage(relPath)
  if not sheets[relPath] then
    local src = Sprite { fromFile = assetsDir .. "/" .. relPath }
    assert(src, "cannot open sheet " .. relPath)
    src:flatten()
    sheets[relPath] = Image(src.cels[1].image)
    src:close()
  end
  return sheets[relPath]
end

-- parse the plan, then build in two passes: appending frames at a tag's
-- end boundary EXTENDS the tag in Aseprite, so all frames must exist
-- before any tag is created
local animations = {}
for entry in entriesPart:gmatch("[^|]+") do
  local name, image, row, frames, durationMs, startX =
    entry:match("^([^:]+):([^:]+):(%d+):(%d+):(%d+):(%d+)$")
  assert(name, "bad plan entry " .. entry)
  table.insert(animations, {
    name = name,
    image = image,
    row = tonumber(row),
    frames = tonumber(frames),
    durationMs = tonumber(durationMs),
    startX = tonumber(startX),
  })
end

local frameIndex = 0
for _, anim in ipairs(animations) do
  local src = sheetImage(anim.image)
  for i = 0, anim.frames - 1 do
    frameIndex = frameIndex + 1
    if frameIndex > #sprite.frames then sprite:newEmptyFrame(frameIndex) end
    local frame = sprite.frames[frameIndex]
    frame.duration = anim.durationMs / 1000
    local cel = sprite:newCel(sprite.layers[1], frame)
    local img = Image(frameW, frameH, ColorMode.RGB)
    -- negative offset blit crops the frame rect out of the big sheet
    img:drawImage(src, Point(-(anim.startX + i * frameW), -(anim.row * frameH)))
    cel.image = img
    cel.position = Point(0, 0)
  end
end

local cursor = 0
for _, anim in ipairs(animations) do
  local tag = sprite:newTag(cursor + 1, cursor + anim.frames)
  tag.name = anim.name
  cursor = cursor + anim.frames
end

sprite:saveAs(out)
print("imported " .. out .. " frames=" .. #sprite.frames .. " tags=" .. #sprite.tags)
