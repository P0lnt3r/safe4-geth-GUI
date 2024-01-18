
import { Col, Row, Avatar, List, Typography, Modal, Button } from "antd";
import { useTransactions } from "../../../../state/transactions/hooks";
import SAFE_LOGO from "../../../../assets/logo/SAFE.png";
import { LoadingOutlined, FileDoneOutlined, LockOutlined } from '@ant-design/icons';
import { Spin } from 'antd';
import "./index.css";
import { useMemo, useState } from "react";
import { TransactionDetails } from "../../../../state/transactions/reducer";
import { ethers } from "ethers";
import EtherAmount from "../../../../utils/EtherAmount";
import { useWalletsActiveAccount } from "../../../../state/wallets/hooks";
import DecodeSupportFunction from "../../../../constants/DecodeSupportFunction";
import TransactionElementSupport from "./TransactionElementSupport";
import TransactionElementTemplate from "./TransactionElementTemplate";
import AccountManagerSafeDeposit from "./AccountManagerSafeDeposit";
import { DB_AddressActivity_Actions } from "../../../../../main/handlers/DBAddressActivitySingalHandler";
const { Text } = Typography;

const TX_TYPE_SEND = "1";
const TX_TYPE_RECEIVE = "2";

export default ({ transaction, setClickTransaction }: {
  transaction: TransactionDetails,
  setClickTransaction: (transaction: TransactionDetails) => void
}) => {
  const activeAccount = useWalletsActiveAccount();
  const {
    status,
    call,
    accountManagerDatas
  } = transaction;
  const { from, to, value, input } = useMemo(() => {
    return {
      from: transaction.refFrom,
      to: transaction.refTo,
      value: call?.value,
      input: call?.input
    }
  }, [transaction]);
  const txType = useMemo(() => {
    if (from == activeAccount) {
      return TX_TYPE_SEND;
    }
    if (to == activeAccount) {
      return TX_TYPE_RECEIVE;
    }
  }, [activeAccount, call]);
  const support = DecodeSupportFunction(to, input);

  return <>
    {
      support && <TransactionElementSupport transaction={transaction} setClickTransaction={setClickTransaction} support={support} />
    }
    {
      !support && <List.Item onClick={() => { setClickTransaction(transaction) }} key={transaction.hash} className="history-element" style={{ paddingLeft: "15px", paddingRight: "15px" }}>
        <Row style={{ width: "100%" }}>
          <span style={{ width: "100%" }}>
            <TransactionElementTemplate status={status} icon={<FileDoneOutlined style={{ color: "black" }} />}
              title="合约调用" description={to} assetFlow={<Text strong> <>- {value && EtherAmount({ raw: value })} SAFE</> </Text>} />
          </span>
          {
            accountManagerDatas && accountManagerDatas.filter(accountManagerData => accountManagerData.action == DB_AddressActivity_Actions.AM_Deposit)
              .map(accountManagerData => {
                return <span style={{ width: "100%", marginTop: "20px" }}>
                  <AccountManagerSafeDeposit from={accountManagerData.from} to={accountManagerData.to} value={accountManagerData.amount} status={1} />
                </span>
              })
          }
        </Row>
      </List.Item>
    }
  </>
}
