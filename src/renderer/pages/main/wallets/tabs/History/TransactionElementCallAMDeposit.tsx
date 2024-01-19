
import { Col, Row, Avatar, List, Typography, Modal, Button } from "antd";
import { useMemo } from "react";
import { TransactionDetails } from "../../../../../state/transactions/reducer";
import { DB_AddressActivity_Actions } from "../../../../../../main/handlers/DBAddressActivitySingalHandler";
import AccountManagerSafeDeposit from "./AccountManagerSafeDeposit";


export default ({ transaction, setClickTransaction, support }: {
  transaction: TransactionDetails,
  setClickTransaction: (transaction: TransactionDetails) => void,
  support: {
    supportFuncName: string,
    inputDecodeResult: any
  }
}) => {
  const {
    status,
    call,
    accountManagerDatas
  } = transaction;
  const { from, to, value, input } = useMemo(() => {
    return {
      from: transaction.refFrom,
      to: support.inputDecodeResult._to,
      value: call?.value,
      input: call?.input
    }
  }, [transaction, call]);

  return <>
    {JSON.stringify(accountManagerDatas)}
    <List.Item onClick={() => { setClickTransaction(transaction) }} key={transaction.hash} className="history-element" style={{ paddingLeft: "15px", paddingRight: "15px" }}>
      {
        !call && accountManagerDatas &&
        accountManagerDatas.filter(accountManagerData => accountManagerData.action == DB_AddressActivity_Actions.AM_Deposit)
          .map(accountManagerData => {
            return <AccountManagerSafeDeposit from={from} to={to} value={value} status={1} />
          })
      }
      {
        call && <AccountManagerSafeDeposit from={from} to={to} value={value} status={status} />
      }
    </List.Item>
  </>

}
