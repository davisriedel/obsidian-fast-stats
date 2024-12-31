import moment from "moment";

const Parser = require("expr-eval").Parser;
const parser = new Parser();
parser.functions.minsToTime = (mins: number, format: string) =>
	moment().startOf("day").add(mins, "minutes").format(format);

export default parser;
