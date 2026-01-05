import { Status, StatusCode } from "express-http-status-handler";
import * as yup from "yup";
import { Request, Response } from "express";
import { GET } from "../utils/decorators";
import GenericDAO from "../doas/GenericDAO";
import { UssdTransactions } from "../models/ussdTransactions";

export class AnalyticsController {
  
  @GET("/transaction/:transaction_id")
  async getTransaction(req: Request, res: Response) {
    const status = new Status();

    try {
      const { transaction_id } = req.params;

      if (transaction_id) {
        const result = new GenericDAO<UssdTransactions>(
          UssdTransactions
        ).selectWherePK(transaction_id);

        if (result) {
          status.successStatus(StatusCode.OK, result);
        } else {
          status.errorStatus(StatusCode.NOT_FOUND);
        }
      } else {
        status.errorStatus(StatusCode.BAD_REQUEST);
      }
    } catch (error) {
      console.log(error);
      status.errorStatus(StatusCode.INTERNAL_SERVER_ERROR);
    }

    return res.status(status.code).json(status);
  }
}

const analyticsController = new AnalyticsController();

export default analyticsController;
