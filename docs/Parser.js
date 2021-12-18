import { Parser } from "./fp-helpers/Parser.js";
import { eff } from "./fp-helpers/Freer.js";
import { COND, HANDLE as MSG_DEF, SEND_MSG as MSG_SEND, LOAD_VAR, LOAD_CONST as LOAD_VAL, NODE, OPERATE, STORE_VAR, SETP_VAL as SET_MEM_VAL, SETP_VAR as SET_MEM_VAR, } from "./Generator.js";
import { NOOP } from "./Interpreter.js";
const r = (r) => new Parser((s) => {
    const match = s.match(r);
    if (match == null || (match.index && match.index > 0)) {
        return Parser.err(`Expected ${r} at "${s}"`, s);
    }
    const token = match[0];
    return Parser.ok(token, s.slice(token.length));
});
const ws = r(/\s*/);
const period = r(/\s*(。?)\s*/);
const quoted = r(/(「|『).+?(」|』)/).map((r) => r.slice(1, -1));
const self = r(/吾/).map(() => "__self__");
const attrPath = r(/之/).apr(quoted).sep(ws);
const variablePath = Parser.noop().or(() => Parser.pure((root) => (path) => [root, ...path])
    .ap(quoted.or(() => self))
    .ap(attrPath));
function sequence(actions) {
    return actions.reduce((prev, cur) => prev.bind(() => cur), eff(NOOP));
}
const LoadValue = Parser.noop()
    .or(() => Parser.pure(LOAD_VAL).apl(r(/有|以/)).ap(quoted.map(Number)).apl(period))
    .or(() => Parser.pure(LOAD_VAL).apl(r(/有言/)).ap(quoted).apl(period));
const LoadVariable = Parser.noop().or(() => Parser.pure(LOAD_VAR)
    .apl(r(/(取|夫)(其|彼)?/))
    .ap(variablePath)
    .apl(period));
const Operate = Parser.noop().or(() => Parser.pure(OPERATE).ap(quoted).apl(ws).apl(r(/之?/)).apl(period));
const StoreVariable = Parser.noop()
    .or(() => Parser.pure(STORE_VAR)
    .apl(r(/今/))
    .ap(variablePath)
    .apl(r(/如是|亦然/))
    .apl(period))
    .or(() => Parser.pure(STORE_VAR).apl(r(/是?謂/)).ap(variablePath).apl(period));
const Block = Parser.noop().or(() => Parser.pure(sequence)
    .apl(r(/「|『/))
    .apl(ws)
    .ap(instruction.sep(ws))
    .apl(ws)
    .apl(r(/」|』/)));
const Conditional = Parser.noop()
    .or(() => Parser.pure(COND)
    .apl(r(/然/))
    .apl(period)
    .apl(ws)
    .ap(Block)
    .apl(ws)
    .apl(r(/不然/))
    .apl(period)
    .apl(ws)
    .ap(Block))
    .or(() => Parser.pure((alt) => COND(eff(NOOP))(alt))
    .apl(r(/不然/))
    .apl(period)
    .apl(ws)
    .ap(Block))
    .or(() => Parser.pure((cons) => COND(cons)(eff(NOOP)))
    .apl(r(/然/))
    .apl(period)
    .apl(ws)
    .ap(Block));
const NewNode = Parser.noop().or(() => Parser.pure(NODE).apl(r(/有此/)).ap(quoted).apl(period));
const SetMember = Parser.noop()
    .or(() => Parser.pure(SET_MEM_VAR)
    .apl(r(/其/))
    .ap(quoted)
    .apl(r(/者/))
    .apl(ws)
    .apl(r(/彼/))
    .ap(variablePath)
    .apl(r(/也/))
    .apl(period))
    .or(() => Parser.pure(SET_MEM_VAL)
    .apl(r(/其/))
    .ap(quoted)
    .apl(r(/也?/))
    .apl(ws)
    .ap(quoted)
    .apl(period));
const MessageDefinition = Parser.noop().or(() => Parser.pure(MSG_DEF)
    .apl(r(/聞/))
    .ap(quoted)
    .apl(r(/則答曰/))
    .ap(Block));
const MessageSend = Parser.noop()
    .or(() => Parser.pure(MSG_SEND)
    .apl(r(/願彼?/))
    .ap(variablePath)
    .ap(quoted)
    .apl(r(/之/))
    .apl(period))
    .or(() => Parser.pure(MSG_SEND)
    .apl(r(/彼/))
    .ap(variablePath)
    .apl(r(/其/))
    .ap(quoted)
    .apl(r(/者何/))
    .apl(period))
    .or(() => Parser.pure(MSG_SEND(["__self__"]))
    .apl(r(/吾(欲|當)/))
    .ap(quoted)
    .apl(r(/之?/))
    .apl(period))
    .or(() => Parser.pure(MSG_SEND(["window"]))
    .apl(r(/請/))
    .apl(ws)
    .ap(quoted)
    .apl(r(/之/))
    .apl(period));
const instruction = Parser.noop()
    .or(() => Block)
    .or(() => Conditional)
    .or(() => MessageDefinition)
    .or(() => MessageSend)
    .or(() => LoadVariable)
    .or(() => LoadValue)
    .or(() => NewNode)
    .or(() => Operate)
    .or(() => StoreVariable)
    .or(() => SetMember);
export const program = Parser.pure(sequence)
    .apl(ws)
    .ap(instruction.sep(ws))
    .apl(ws);
