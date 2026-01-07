import * as yup from "yup";

export const serviceTypeValidator = yup
  .string()
  .oneOf(["all", "banking", "electricity", "airtime", "water", "mobileMoney"]);
