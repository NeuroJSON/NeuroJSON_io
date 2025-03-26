// Licensed to Pioneers in Engineering under one
// or more contributor license agreements.  See the NOTICE file
// distributed with this work for additional information
// regarding copyright ownership.  Pioneers in Engineering licenses
// this file to you under the Apache License, Version 2.0 (the
// "License"); you may not use this file except in compliance
//  with the License.  You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License

// This file was (hastily) ported from lua-ubjson.
// The code structure there will make probably make more sense.
// Multiple return values there have been manually transformed into arrays
// here, and generally make the code harder to understand.
// There are also a few lingering Lua-isms, like keeping track of stack depth
// for error handling, excessive use of nil / null, variable names suggesting
// string and buffers are the same thing, and ambiguity about what's an array
// and what's an object.
// The comments also have not been updated. Comments that look like they've
// been mangled by a regex probably have.

// Global dependencies here.

//var buffer_module = require('buffer');

var abs = Math.abs;
var floor = Math.floor;
var dumpint = function (val, size, type, endian) {
  var b = buffer_module.Buffer(size);
  if (size === 1)
    endian = '';
  b[write_fun[type] + endian].apply(b, [val, 0]);
  return b;
};

var dumpfloat = function (val, type, endian) {
  var b;

  if (type === 'd') {
    b = buffer_module.Buffer(4);
    b['writeFloat' + endian].apply(b, [val, 0]);
  } else if (type === 'D') {
    b = buffer_module.Buffer(8);
    b['writeDouble' + endian].apply(b, [val, 0]);
  } else {
    throw 'Unexpected float type ' + type + '.';
  }
  return b;
};

var undumpint = function(buf, offset, type, size, endian) {
  if (size === 1)
    endian = '';
  return buf[read_fun[type] + endian].apply(buf, [offset]);
};

var undumpfloat = function(buf, offset, type, endian) {
  if (type === 'd') {
    return buf['readFloat' + endian].apply(buf, [offset]);
  } else if (type === 'D') {
    return buf['readDouble' + endian].apply(buf, [offset]);
  } else {
    throw 'Unexpected float type ' + type + '.';
  }
};

var toBuffer = function (str) {
  return buffer_module.Buffer(str);
};

var type = function (val) {
  return typeof val;
};
var error = function (msg) {
  throw "js-bjdata: " + msg;
};

var insert = function(array, val) {
  array.push(buffer_module.Buffer(val));
};

var bufStr = function(buf, start, end) {
  return buf.slice(start, end + 1).toString();
};

// Mapping from maximum value -> ubjson tag
var int_maxes = [
  256.0,
  65536.0,
  4294967296.0,
  18446744073709551616.0,
];

var int_tags = [
  'U',
  'u',
  'm',
  'M',
  'M'
];

var neg_int_tags = [
  'i',
  'I',
  'l',
  'L',
  'L'
];

// ubjson tag -> size in bytes
var int_tag_size = {
  U : 1,
  i : 1,
  u : 2,
  I : 2,
  m : 4,
  l : 4,
  M : 8,
  L : 8,
};

// bjdata tag -> jdata tags
var jd_type = {
  U : "uint8",
  i : "int8",
  u : "uint16",
  I : "int16",
  m : "uint32",
  l : "int32",
  M : "uint64",
  L : "int64",
  h : "int16",
  d : "float32",
  D : "float64",
};

var write_fun = {
  U : "writeUInt8",
  i : "writeInt8",
  u : "writeUInt16",
  I : "writeInt16",
  m : "writeUInt32",
  l : "writeInt32",
  M : "writeBigUInt64",
  L : "writeBigInt64",
  h : "writeInt16",
  d : "writeFloat",
  D : "writeDouble",
  C : "writeUInt8"
};

var read_fun = {
  U : "readUInt8",
  i : "readInt8",
  u : "readUInt16",
  I : "readInt16",
  m : "readUInt32",
  l : "readInt32",
  M : "readBigUInt64",
  L : "readBigInt64",
  h : "readInt16",
  d : "readFloat",
  D : "readDouble",
  C : "readUInt8"
};

// bjdata tag -> jdata tags
var jd_len = {
  U : 1,
  i : 1,
  u : 2,
  I : 2,
  m : 4,
  l : 4,
  M : 8,
  L : 8,
  d : 4,
  D : 8,
};

var typedfun={
  "Float32Array":null,"Float64Array":null,
  "Int8Array":null,  "Uint8Array":null,
  "Int16Array":null, "Uint16Array":null,
  "Int32Array":null, "Uint32Array":null,
  "BigInt64Array":null, "BigUint64Array":null
};

// Use doubles to serialize Lua numbers.
var use_double = true;

// Get the smallest tag and size to hold a value.
function int_tag(val) {
  if ( val >= 0 && val < 256 ) {
    return ['U', 1];
  }
  var last_key = 'i';
  // Calculate the absolute value.
  if ( val < 0 ) {
    for (let idx = 0 ; idx < int_maxes.length; idx++) {
      let max = int_maxes[idx];
      if ( val >= -max/2 ) {
        return [last_key, int_tag_size[last_key]];
      } else {
        last_key = neg_int_tags[idx+1];
      }
    }
  }
  last_key = 'U';
  for (let idx = 0 ; idx < int_maxes.length; idx++) {
    let max = int_maxes[idx];
    if ( val < max ) {
      return [last_key, int_tag_size[last_key]];
    } else {
      last_key = int_tags[idx+1];
    }
  }
  return [last_key, int_tag_size[last_key]];
}

// If val can be represented by a fixed size value type, return the tag for
// that type, otherwise return the Lua type string.
function val_tag(val) {
  var t = type(val);
  if ( t === 'number' || t === 'bigint') {
    t = int_tag(val)[0];
  } else if ( t === 'boolean' ) {
    if ( t ) {
      return 'T';
    } else {
      return 'F';
    }
  } else if ( t === 'null' ) {
    return 'Z';
  }
  return t;
}

// Pre-declare encode_inner
var encode_inner;

// Determines whether an table should become an array or a table.
// Also determines length, and whether the optimized container optimization can
// be applied.
// returns [use_obj, length, max_index, shared_tag, write_val]
// where
// use_obj is true iff the table should become a ubjson object (not an array).
// length is the number of entries in the array or table.
// max_index is the largest integer index.
// shared_tag is a ubjson type tag if ( the optimized container format can be
//     applied, otherwise is the string 'mixed'
// write_val is a function which writes a value for the object or array.
// write_val has the same type as encode_inner
//   (value, buffer, memo, depth) -> ()
//   where value is the value to be serialized
//         buffer is a table of strings which will be concatenated together to
//             produce the output
//         memo is a table mapping currently entered tables to true
//         depth is the recursion depth from the user's call
function array_helper(val) {
  // TODO(kzentner): Handle integer tags more intelligently.
  // Currently, this function only handles integers well when every integer is
  // expected to have the same tag. In theory, this could produce an array for
  // any integer type tag, but in practice probably will almost always only
  // produce 'U'.
  // Basically, this function expects val_tag to return the same tag for every
  // value if the fixed-type container optimization can be applied. This is
  // definitely not true. For example, [0, -1, 2] produces the tags ['U', 'i',
  // 'U'], but all the entries can be represented by one signed byte.
  // 
  var t = null;
  var length = 0;
  var max = 0;

  for (var k in val) {
    var v = val[k];
    if ( k > max ) {
      max = k;
    }
    if ( t === null ) {
      t = val_tag(v);
    }
    if ( t !== val_tag(v) ) {
      t = 'mixed';
    }
    length = length + 1;
  }

  var write_val = encode_inner;

  if ( t !== null && t.length === 1 ) {
    var size = int_tag_size[t];
    if ( size ) {
      write_val = function(val, buffer, memo) {
        insert(buffer, dumpint(val, size, t, 'LE'));
      };
    } else if ( t === 'd' ) {
      write_val = function(val, buffer, memo) {
        insert(buffer, dumpfloat(val, 'd', 'LE'));
      };
    } else if ( t === 'D' ) {
      write_val = function(val, buffer, memo) {
        insert(buffer, dumpfloat(val, 'D', 'LE'));
      };
    } else {
      // Tag should be 'T', 'F', 'Z'
      write_val = function(val, buffer, memo) {
      };
    }
  }

  // TODO(kzentner): Handle array-likes like Uint8Array's, etc. better.
  // Note that isArray(new Uint8Array) == false
  return [!Array.isArray(val), length, max, t, write_val];
}

function encode_int(val, buffer) {
  var ts = int_tag(val);
  var tag = ts[0];
  var size = ts[1];
  insert(buffer, tag);
  insert(buffer, dumpint(val, size, tag, 'LE'));
}

function encode_inner(val, buffer, memo, depth) {
  var k;
  // if val in memo. Some things, Javascript makes really weird.
  if ( ~memo.indexOf(val) ) {
    error('Cannot serialize circular data structure.', depth);
  }
  if ( depth === undefined ) {
    error('Depth missing.');
  }

  var t = type(val);
  if ( t === 'number' ) {
    if ( floor(val) === val ) {
      encode_int(val, buffer);
    } else {
      if ( use_double ) {
        insert(buffer, 'D');
        insert(buffer, dumpfloat(val, 'D', 'LE'));
      } else {
        insert(buffer, 'd');
        insert(buffer, dumpfloat(val, 'd', 'LE'));
      }
    }
  } else if (t === 'bigint') {
      encode_int(val, buffer);
  } else if ( t === 'null' || t === 'undefined' ) {
    insert(buffer, 'Z');
  } else if ( t === 'boolean' ) {
    if ( val ) {
      insert(buffer, 'T');
    } else {
      insert(buffer, 'F');
    }
  } else if ( t === 'string' ) {
    insert(buffer, 'S');
    encode_int(val.length, buffer);
    insert(buffer, val);
  } else if ( t === 'object' ) {
    memo.push(val);
    var ulmtw = array_helper(val);
    var use_obj = ulmtw[0];
    var length = ulmtw[1];
    var max = ulmtw[2];
    var tag = ulmtw[3];
    var write_val = ulmtw[4];
    if ( use_obj ) {
      insert(buffer, '{');
    } else {
      insert(buffer, '[');
    }

    if ( !use_obj && tag !== null && tag.length === 1 ) {
      insert(buffer, '$');
      insert(buffer, tag);
      insert(buffer, '#');
      encode_int(length, buffer);
    }

    if ( use_obj ) {
      for (k in val) {
        var v = val[k];
        var str = k + '';
        encode_int(str.length, buffer);
        insert(buffer, str);
        encode_inner(v, buffer, memo, depth + 1);
      }
    } else {
      if(tag !== null) {
        for (k = 0; k <= max; k++ ) {
          write_val(val[k], buffer, memo, depth + 1);
        }
      } else {
        for (k = 0; k <= max; k++ ) {
          encode_inner(val[k], buffer, memo, depth + 1);
        }
      }
    }

    if ( use_obj || tag === null ) {
      if ( use_obj ) {
        insert(buffer, '}');
      } else {
        insert(buffer, ']');
      }
    }

    // Remove val from memo.
    memo.splice(memo.indexOf(val), 1);
  }
}

function encode(value, state) {
  var buffer = [];
  var memo = [];
  var k;
  encode_inner(value, buffer, memo, 3);
  var total_length = 0;
  for (k in buffer) {
    total_length += buffer[k].length;
  }
  var out = buffer_module.Buffer(total_length);
  var current_offset = 0;
  for (k in buffer) {
    var b = buffer[k];
    b.copy(out, current_offset, 0, b.length);
    current_offset += b.length;
  }
  return out;
}

function decode_int(str, offset, depth, error_context) {
  var c = bufStr(str, offset, offset);
  var int_size = int_tag_size[c];
  if ( int_size === undefined ) {
    error(error_context + ' length did not have an integer tag.', depth);
  }
  var i = undumpint(str, offset + 1, c, int_size, 'LE');
  if ( c === 'U' && i < 0 ) {
    // Undo twos-complement
    i = 256 + i;
  }
  
  return [i, offset + 1 + int_size];
}

// Returns function with signature
// (str, offset, depth) -> val, new_offset, skip
// where str is the input string
//       offset is the index into str to start reading at
//       depth is the recursion depth from the user's call
//       val is the read value
//       new_offset is the offset after the read element
//       skip is whether the object should be recognized
//           (used to implement noop)
function get_read_func(tag) {
  var int_size = int_tag_size[tag];
  if ( tag === 'C' ) {
    int_size = 1;
  }
  if ( int_size !== undefined ) {
    return function(str, offset, depth) {
      return [undumpint(str, offset, tag, int_size, 'LE'), offset + int_size];
    };
  } else if ( tag === 'd' ) {
    return function(str, offset, depth) {
      return [undumpfloat(str, offset, 'd', 'LE'), offset + 4];
    };
  } else if ( tag === 'D' ) {
    return function(str, offset, depth) {
      return [undumpfloat(str, offset, 'D', 'LE'), offset + 8];
    };
  } else if ( tag === 'T' ) {
    return function(str, offset, depth) {
      return [true, offset];
    };
  } else if ( tag === 'F' ) {
    return function(str, offset, depth) {
      return [false, offset];
    };
  } else if ( tag === 'Z' ) {
    return function(str, offset, depth) {
      return [null, offset];
    };
  } else if ( tag === 'N' ) {
    return function(str, offset, depth) {
      return [null, offset, true];
    };
  } else {
    return null;
  }
}

// Decodes a string. Does ! read the type tag, so that it can be used to
// decode ubjson object keys.
function decode_str(str, offset, depth) {
  var ls = decode_int(str, offset, depth + 1, 'String at offset ' + offset);
  var str_length = ls[0];
  var str_start = ls[1];
  // Since bufStr is inclusive at of the end, -1 is needed.
  return [bufStr(str, str_start, str_start + str_length - 1), str_start + str_length];
}

// Recursive function used to decode object.
// (str, offset, depth) -> (val, new_offset, skip)
// where str is the input string
//       offset is the index into str to start reading at
//       depth is the recursion depth from the user's call
//       val is the read value
//       new_offset is the offset after the read element
//       skip is whether the object should be recognized
//           (used to implement noop)
function decode_inner(str, offset, depth) {
  if ( depth === null ) {
    error('Depth missing');
  }
  var c = bufStr(str, offset, offset);
  var int_size = int_tag_size[c];
  if ( int_size !== undefined ) {
    return [undumpint(str, offset + 1, c, int_size, 'LE'), offset + 1 + int_size];
  } else if ( c === 'C' ) {
    return [undumpint(str, offset + 1, c, 1, 'LE'), offset + 2];
  } else if ( c === 'S' || c === 'H' ) {
    // TODO(kzentner): How to handle huge numbers?
    return decode_str(str, offset + 1, depth + 1)
  } else if ( c === 'T' ) {
    return [true, offset + 1];
  } else if ( c === 'F' ) {
    return [false, offset + 1];
  } else if ( c === 'Z' ) {
    return [null, offset + 1];
  } else if ( c === 'N' ) {
    return [null, offset + 1, true];
  } else if ( c === 'd' ) {
    return [undumpfloat(str, offset + 1, 'd', 'LE'), offset + 5];
  } else if ( c === 'D' ) {
    return [undumpfloat(str, offset + 1, 'D', 'LE'), offset + 9];
  } else if ( c === '[' || c === '{' ) {
    var start_offset = offset + 1;
    var tag = bufStr(str, start_offset, start_offset);
    var length = null;
    var out;
    var read_val = decode_inner;
    var t = ' '
    if ( tag === '$' ) {
      start_offset = start_offset + 1;
      t = bufStr(str, start_offset, start_offset);
      start_offset = start_offset + 1;
      tag = bufStr(str, start_offset, start_offset);
      read_val = get_read_func(t);
      if ( read_val === null ) {
        if ( c === '[' ) {
          error('Type tag for non value type in array at offset ' + offset,
              depth);
        } else {
          error('Type tag for non value type in object at offset ' + offset,
                depth);
        }
      }
    }

    // TODO(kzentner): Do not construct the error message every time.
    if ( tag === '#' ) {
      var msg;
      if ( c === '[' ) {
        msg = 'Array';
      } else {
        msg = 'Object';
      }
      msg = msg + ' length at offset ' + offset;
      var ls;
      start_offset = start_offset + 1;

      if(bufStr(str, start_offset, start_offset) == '['){
          ls = decode_inner(str, start_offset, depth + 1, msg);
          length = ls[0].reduce((a, b)=> a*b, 1);
      }else{
          ls = decode_int(str, start_offset, depth + 1, msg);
          length = ls[0];
      }
      start_offset = ls[1];
    }
    var elt_offset = start_offset;
    var key, val, skip;
    var ke;
    var ves;
    var i;
    if ( c === '[' ) {
      out = [];
      if ( length !== null ) {
        elt_offset = start_offset;
        let tagid=jd_type[t];
        if(tagid !== undefined){
          let type=jd_type[t];
          let bytelen=jd_len[t] * length;
          let typename=type.charAt(0).toUpperCase() + type.substring(1) + "Array";
          if(type=='int64' || type=='uint64')
               typename='Big'+typename;
          out=new Uint8Array(buffer_module.Buffer.from(str.buffer, elt_offset, bytelen));
          if(typedfun[typename] == null)
              typedfun[typename]=new Function('d', 'return new '+typename+'(d)');
          let typecast=typedfun[typename];
          out=typecast(out.buffer);
          elt_offset+=bytelen;
        }else{
          for (i = 0; i < length; i++) {
            ves = read_val(str, elt_offset, depth + 1);
            val = ves[0];
            elt_offset = ves[1];
            skip = ves[2];
            if ( ! skip ) {
              out.push(val);
            }
          }
        }
      } else {
        while ( bufStr(str, elt_offset, elt_offset) !== ']' ) {
          ves = read_val(str, elt_offset, depth + 1);
          val = ves[0];
          elt_offset = ves[1];
          skip = ves[2];
          if ( ! skip ) {
            out.push(val);
          }
        }
        elt_offset++;
      }
    } else {
      out = {};
      if ( length !== null ) {
        for (i = 0; i < length; i++) {
          ke = decode_str(str, elt_offset, depth + 1);
          key = ke[0];
          elt_offset = ke[1];
          ves = read_val(str, elt_offset, depth + 1);
          val = ves[0];
          elt_offset = ves[1];
          skip = ves[2];
          if ( ! skip ) {
            out[key] = val;
          }
        }
      } else {
        while ( bufStr(str, elt_offset, elt_offset) !== '}' ) {
          ke = decode_str(str, elt_offset, depth + 1);
          key = ke[0];
          elt_offset = ke[1];
          ves = read_val(str, elt_offset, depth + 1);
          val = ves[0];
          elt_offset = ves[1];
          skip = ves[2];
          if ( ! skip ) {
            out[key] = val;
          }
        }
        elt_offset++;
      }
    }
    return [out, elt_offset];
  } else {
    error('Unrecognized type tag ' + c + ' at offset ' + offset + '.', depth);
  }
}

// Get decoded value and the offset after it in the buffer.
function decode_offset(str, offset) {
  if (offset === undefined) {
    offset = 0;
  }
  return decode_inner(str, offset, 1);
}

// Just get the decoded value.
function decode(str, offset) {
  return decode_offset(str, offset);
}

var bjdata = {
  version : 'js-bjdata 0.2',
  encode : encode,
  decode : decode,
  decode_offset: decode_offset
};

//module.exports = bjdata;