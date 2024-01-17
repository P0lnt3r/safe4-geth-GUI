
import { Col, Row, Avatar, List, Typography, Modal, Button } from "antd";
import { useTransactions } from "../../../../state/transactions/hooks";
import SAFE_LOGO from "../../../../assets/logo/SAFE.png";
import { LoadingOutlined , FileDoneOutlined } from '@ant-design/icons';
import { Spin } from 'antd';
import "./index.css";
import { useMemo, useState } from "react";
import { TransactionDetails } from "../../../../state/transactions/reducer";
import { ethers } from "ethers";
import EtherAmount from "../../../../utils/EtherAmount";
import { useWalletsActiveAccount } from "../../../../state/wallets/hooks";
const { Text } = Typography;
const TX_TYPE_SEND = "1";
const TX_TYPE_RECEIVE = "2";

export default ({ transaction , setClickTransaction }: {
  transaction: TransactionDetails ,
  setClickTransaction : (transaction : TransactionDetails) => void
}) => {
  const {
    status,
    call,
  } = transaction;
  const { from, to, value } = call ? call : {
    from: null, to: null, value: null
  };
  const activeAccount = useWalletsActiveAccount();
  const txType = useMemo(() => {
    if (from == activeAccount) {
      return TX_TYPE_SEND;
    }
    if (to == activeAccount) {
      return TX_TYPE_RECEIVE;
    }
  }, [activeAccount, call])

  return <>
    <List.Item onClick={()=>{setClickTransaction(transaction)}} key={transaction.hash} className="history-element" style={{ paddingLeft: "15px", paddingRight: "15px" }}>
      <List.Item.Meta
        avatar={
          <>
            <span>
              {
                !status && <Spin indicator={<LoadingOutlined style={{ fontSize: "34px", marginLeft: "-17px", marginTop: "-14px" }} />} >
                  <Avatar style={{marginTop:"8px",background:"#e6e6e6"}} src={<FileDoneOutlined />} />
                </Spin>
              }
              {
                status && <Avatar style={{marginTop:"8px",background:"#e6e6e6"}} src={<FileDoneOutlined />} />
              }
            </span>
          </>
        }
        title={<>
          <Text strong>
            {txType == TX_TYPE_RECEIVE && "接收"}
            {txType == TX_TYPE_SEND && "发送"}
          </Text>
        </>}
        description={
          <>
            {txType == TX_TYPE_RECEIVE && from}
            {txType == TX_TYPE_SEND && to}
          </>
        }
      />
      <div>
        {txType == TX_TYPE_RECEIVE && <>
          <Text strong type="success">+{value} SAFE</Text>
        </>}
        {txType == TX_TYPE_SEND && <>
          <Text strong>-{value} SAFE</Text>
        </>}
      </div>
    </List.Item>
  </>
}
