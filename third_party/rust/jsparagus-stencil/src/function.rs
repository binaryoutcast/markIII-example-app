#[derive(Debug)]
pub struct FunctionFlags {
    flags: u16,
}

// WARNING
// The following section is generated by update_stencil.py.
// Do mot modify manually.
//
// @@@@ BEGIN TYPES @@@@
#[derive(Debug, Clone, Copy)]
pub enum FunctionKind {
    NormalFunction = 0,
    Arrow = 1,
    Method = 2,
    ClassConstructor = 3,
    Getter = 4,
    Setter = 5,
    AsmJS = 6,
    Wasm = 7,
    FunctionKindLimit = 8,
}

#[allow(dead_code)]
const FUNCTION_KIND_SHIFT: u16 = 0;
#[allow(dead_code)]
const FUNCTION_KIND_MASK: u16 = 0x0007;
#[allow(dead_code)]
const EXTENDED: u16 = 1 << 3;
#[allow(dead_code)]
const SELF_HOSTED: u16 = 1 << 4;
#[allow(dead_code)]
const BASESCRIPT: u16 = 1 << 5;
#[allow(dead_code)]
const SELFHOSTLAZY: u16 = 1 << 6;
#[allow(dead_code)]
const CONSTRUCTOR: u16 = 1 << 7;
#[allow(dead_code)]
const LAMBDA: u16 = 1 << 9;
#[allow(dead_code)]
const WASM_JIT_ENTRY: u16 = 1 << 10;
#[allow(dead_code)]
const HAS_INFERRED_NAME: u16 = 1 << 11;
#[allow(dead_code)]
const HAS_GUESSED_ATOM: u16 = 1 << 12;
#[allow(dead_code)]
const RESOLVED_NAME: u16 = 1 << 13;
#[allow(dead_code)]
const RESOLVED_LENGTH: u16 = 1 << 14;
#[allow(dead_code)]
const GHOST_FUNCTION: u16 = 1 << 15;
#[allow(dead_code)]
const NORMAL_KIND: u16 = (FunctionKind::NormalFunction as u16) << FUNCTION_KIND_SHIFT;
#[allow(dead_code)]
const ASMJS_KIND: u16 = (FunctionKind::AsmJS as u16) << FUNCTION_KIND_SHIFT;
#[allow(dead_code)]
const WASM_KIND: u16 = (FunctionKind::Wasm as u16) << FUNCTION_KIND_SHIFT;
#[allow(dead_code)]
const ARROW_KIND: u16 = (FunctionKind::Arrow as u16) << FUNCTION_KIND_SHIFT;
#[allow(dead_code)]
const METHOD_KIND: u16 = (FunctionKind::Method as u16) << FUNCTION_KIND_SHIFT;
#[allow(dead_code)]
const CLASSCONSTRUCTOR_KIND: u16 = (FunctionKind::ClassConstructor as u16) << FUNCTION_KIND_SHIFT;
#[allow(dead_code)]
const GETTER_KIND: u16 = (FunctionKind::Getter as u16) << FUNCTION_KIND_SHIFT;
#[allow(dead_code)]
const SETTER_KIND: u16 = (FunctionKind::Setter as u16) << FUNCTION_KIND_SHIFT;
#[allow(dead_code)]
const NATIVE_FUN: u16 = NORMAL_KIND;
#[allow(dead_code)]
const NATIVE_CTOR: u16 = CONSTRUCTOR | NORMAL_KIND;
#[allow(dead_code)]
const ASMJS_CTOR: u16 = CONSTRUCTOR | ASMJS_KIND;
#[allow(dead_code)]
const ASMJS_LAMBDA_CTOR: u16 = CONSTRUCTOR | LAMBDA | ASMJS_KIND;
#[allow(dead_code)]
const WASM: u16 = WASM_KIND;
#[allow(dead_code)]
const INTERPRETED_NORMAL: u16 = BASESCRIPT | CONSTRUCTOR | NORMAL_KIND;
#[allow(dead_code)]
const INTERPRETED_CLASS_CTOR: u16 = BASESCRIPT | CONSTRUCTOR | CLASSCONSTRUCTOR_KIND;
#[allow(dead_code)]
const INTERPRETED_GENERATOR_OR_ASYNC: u16 = BASESCRIPT | NORMAL_KIND;
#[allow(dead_code)]
const INTERPRETED_LAMBDA: u16 = BASESCRIPT | LAMBDA | CONSTRUCTOR | NORMAL_KIND;
#[allow(dead_code)]
const INTERPRETED_LAMBDA_ARROW: u16 = BASESCRIPT | LAMBDA | ARROW_KIND;
#[allow(dead_code)]
const INTERPRETED_LAMBDA_GENERATOR_OR_ASYNC: u16 = BASESCRIPT | LAMBDA | NORMAL_KIND;
#[allow(dead_code)]
const INTERPRETED_GETTER: u16 = BASESCRIPT | GETTER_KIND;
#[allow(dead_code)]
const INTERPRETED_SETTER: u16 = BASESCRIPT | SETTER_KIND;
#[allow(dead_code)]
const INTERPRETED_METHOD: u16 = BASESCRIPT | METHOD_KIND;
#[allow(dead_code)]
const MUTABLE_FLAGS: u16 = RESOLVED_NAME | RESOLVED_LENGTH;
#[allow(dead_code)]
const STABLE_ACROSS_CLONES: u16 =
    CONSTRUCTOR | LAMBDA | SELF_HOSTED | FUNCTION_KIND_MASK | GHOST_FUNCTION;
// @@@@ END TYPES @@@@

#[derive(Debug)]
pub struct FunctionSyntaxKind {
    kind: FunctionKind,
    is_lambda: bool,
    is_generator: bool,
    is_async: bool,
}

impl FunctionSyntaxKind {
    pub fn function_declaration(is_generator: bool, is_async: bool) -> Self {
        Self {
            kind: FunctionKind::NormalFunction,
            is_lambda: false,
            is_generator,
            is_async,
        }
    }

    pub fn function_expression(is_generator: bool, is_async: bool) -> Self {
        Self {
            kind: FunctionKind::NormalFunction,
            is_lambda: true,
            is_generator,
            is_async,
        }
    }

    pub fn method(is_generator: bool, is_async: bool) -> Self {
        Self {
            kind: FunctionKind::Method,
            is_lambda: false,
            is_generator,
            is_async,
        }
    }

    pub fn getter() -> Self {
        FunctionSyntaxKind {
            kind: FunctionKind::Getter,
            is_lambda: false,
            is_generator: false,
            is_async: false,
        }
    }

    pub fn setter() -> Self {
        FunctionSyntaxKind {
            kind: FunctionKind::Setter,
            is_lambda: false,
            is_generator: false,
            is_async: false,
        }
    }

    pub fn arrow(is_async: bool) -> Self {
        Self {
            kind: FunctionKind::Arrow,
            is_lambda: true,
            is_generator: false,
            is_async,
        }
    }

    pub fn is_generator(&self) -> bool {
        self.is_generator
    }

    pub fn is_async(&self) -> bool {
        self.is_async
    }
}

impl FunctionFlags {
    fn new(flags: u16) -> Self {
        debug_assert!(
            (((FunctionKind::FunctionKindLimit as u16) - 1) << FUNCTION_KIND_SHIFT)
                <= FUNCTION_KIND_MASK
        );

        Self { flags }
    }

    /// Returns empty flag that is used for top level script
    pub fn empty() -> Self {
        Self { flags: 0 }
    }

    pub fn interpreted(syntax_kind: FunctionSyntaxKind) -> Self {
        let kind_flag = (syntax_kind.kind as u16) << FUNCTION_KIND_SHIFT;
        let mut flags = BASESCRIPT | kind_flag;
        match syntax_kind.kind {
            FunctionKind::NormalFunction => {
                if !syntax_kind.is_generator && !syntax_kind.is_async {
                    flags |= CONSTRUCTOR;
                }
                if syntax_kind.is_lambda {
                    flags |= LAMBDA;
                }
            }
            FunctionKind::ClassConstructor => {
                debug_assert!(!syntax_kind.is_generator);
                debug_assert!(!syntax_kind.is_async);
                flags |= CONSTRUCTOR;
            }
            _ => {}
        }
        Self::new(flags)
    }

    pub fn is_arrow(&self) -> bool {
        let kind_num = (self.flags >> FUNCTION_KIND_SHIFT) & FUNCTION_KIND_MASK;
        kind_num == FunctionKind::Arrow as u16
    }
}

impl From<FunctionFlags> for u16 {
    fn from(flags: FunctionFlags) -> u16 {
        flags.flags
    }
}
