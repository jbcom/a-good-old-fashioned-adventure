local function read_all(path)
  local file = assert(io.open(path, "r"))
  local text = file:read("*a")
  file:close()
  return text
end

local function skip_ws(text, index)
  while index <= #text do
    local c = text:sub(index, index)
    if c ~= " " and c ~= "\n" and c ~= "\r" and c ~= "\t" then
      break
    end
    index = index + 1
  end
  return index
end

local function parse_string(text, index)
  index = index + 1
  local out = {}
  while index <= #text do
    local c = text:sub(index, index)
    if c == '"' then
      return table.concat(out), index + 1
    end
    if c == "\\" then
      local next_c = text:sub(index + 1, index + 1)
      if next_c == '"' or next_c == "\\" or next_c == "/" then
        table.insert(out, next_c)
        index = index + 2
      elseif next_c == "n" then
        table.insert(out, "\n")
        index = index + 2
      elseif next_c == "r" then
        table.insert(out, "\r")
        index = index + 2
      elseif next_c == "t" then
        table.insert(out, "\t")
        index = index + 2
      else
        error("unsupported JSON escape: \\" .. next_c)
      end
    else
      table.insert(out, c)
      index = index + 1
    end
  end
  error("unterminated JSON string")
end

local function parse_number(text, index)
  local start = index
  while index <= #text and text:sub(index, index):match("[%d%+%-%eE%.]") do
    index = index + 1
  end
  return tonumber(text:sub(start, index - 1)), index
end

local parse_value

local function parse_array(text, index)
  local array = {}
  index = skip_ws(text, index + 1)
  if text:sub(index, index) == "]" then
    return array, index + 1
  end
  while true do
    local value
    value, index = parse_value(text, index)
    table.insert(array, value)
    index = skip_ws(text, index)
    local c = text:sub(index, index)
    if c == "]" then
      return array, index + 1
    end
    if c ~= "," then
      error("expected comma in JSON array")
    end
    index = skip_ws(text, index + 1)
  end
end

local function parse_object(text, index)
  local object = {}
  index = skip_ws(text, index + 1)
  if text:sub(index, index) == "}" then
    return object, index + 1
  end
  while true do
    local key
    key, index = parse_string(text, index)
    index = skip_ws(text, index)
    if text:sub(index, index) ~= ":" then
      error("expected colon in JSON object")
    end
    index = skip_ws(text, index + 1)
    object[key], index = parse_value(text, index)
    index = skip_ws(text, index)
    local c = text:sub(index, index)
    if c == "}" then
      return object, index + 1
    end
    if c ~= "," then
      error("expected comma in JSON object")
    end
    index = skip_ws(text, index + 1)
  end
end

parse_value = function(text, index)
  index = skip_ws(text, index)
  local c = text:sub(index, index)
  if c == '"' then
    return parse_string(text, index)
  end
  if c == "{" then
    return parse_object(text, index)
  end
  if c == "[" then
    return parse_array(text, index)
  end
  if text:sub(index, index + 3) == "true" then
    return true, index + 4
  end
  if text:sub(index, index + 4) == "false" then
    return false, index + 5
  end
  if text:sub(index, index + 3) == "null" then
    return nil, index + 4
  end
  return parse_number(text, index)
end

local function parse_json(path)
  local text = read_all(path)
  local value, index = parse_value(text, 1)
  index = skip_ws(text, index)
  if index <= #text then
    error("unexpected trailing JSON data")
  end
  return value
end

local input_path = app.params["input"]
if not input_path then
  error("missing --script-param input=<payload.json>")
end

local payload = parse_json(input_path)
local spr = Sprite(payload.width, payload.height, ColorMode.RGB)
spr.layers[1].name = payload.layerName or "pixels"

local img = Image(payload.width, payload.height, ColorMode.RGB)
for _, pixel in ipairs(payload.pixels) do
  img:putPixel(
    pixel.x,
    pixel.y,
    app.pixelColor.rgba(pixel.r, pixel.g, pixel.b, pixel.a or 255)
  )
end

spr:newCel(spr.layers[1], spr.frames[1], img, Point(0, 0))
spr:saveAs(payload.asepriteFile)
spr:saveCopyAs(payload.pngFile)
app.exit()
