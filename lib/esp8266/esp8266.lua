local obj1 = {
    [0] = 'shepherd',
    [1] = 'demo-1'
}

local ipso = {
    [3] = {                     -- oid = 1, device
        attrs = {},
        [0] = {                 -- iid = 0
            attrs = {},
            [0] = {
                attrs = { pmin, pmax, gt, lt, step },
                value = 'shepherd',   -- rid = 0, manuf
            }
            [1] = 'demo-1'      -- rid = 1, model
        }
    },
}

-- IPSO methods
-- setObjectInstance(oid, iid, instance)
-- setResource(oid, iid, rid)

-- Ipso = {}
-- function Ipso:new (o)
--     o = o or {}
--     setmetatable(o, self)
--     self.__index = self
--     return o;
-- end

Resource = {
    oid = 0,
    iid = 0,
    rid = 0,
    type = 'string',
    access = 'R',
    range = nil,
    value = nil
}

function Resource:new (o, rid, type, access, range, value)
    o = o or {}
    setmetatable(o, self)
    self.__index = self
    self.rid = rid or 0
    self.type = type or 'string'
    self.range = range or nil
    self.value = value or 0
end