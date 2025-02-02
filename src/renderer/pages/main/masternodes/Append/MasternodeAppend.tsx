
import { Typography, Row, Col, Button, Card, Checkbox, CheckboxProps, Divider, Space, Input, Slider, InputNumber, Alert, Spin } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { LeftOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { CurrencyAmount, JSBI } from '@uniswap/sdk';
import { ethers } from 'ethers';
import { AppState } from '../../../../state';
import { useMasternodeStorageContract } from '../../../../hooks/useContracts';
import { useETHBalances, useWalletsActiveAccount } from '../../../../state/wallets/hooks';
import { MasternodeInfo, formatMasternode } from '../../../../structs/Masternode';
import AppendModalConfirm from './AppendModal-Confirm';
import Masternode from '../Masternode';
import useAddrNodeInfo from '../../../../hooks/useAddrIsNode';
import { Safe4_Business_Config } from '../../../../config';
import { useTranslation } from 'react-i18next';

const { Text, Title } = Typography;

export default () => {

  const { t } = useTranslation();
  const navigate = useNavigate();
  const masternodeAppend = useSelector<AppState, string | undefined>(state => state.application.control.masternodeAppend);
  const masternodeStorageContract = useMasternodeStorageContract();
  const activeAccount = useWalletsActiveAccount();
  const balance = useETHBalances([activeAccount])[activeAccount];
  const [masternodeInfo, setMasternodeInfo] = useState<MasternodeInfo>();
  const activeAccountNodeInfo = useAddrNodeInfo(activeAccount);

  useEffect(() => {
    if (masternodeAppend && masternodeStorageContract) {
      // function getInfo(address _addr) external view returns (MasterNodeInfo memory);
      masternodeStorageContract.callStatic.getInfo(masternodeAppend)
        .then(_masternodeInfo => setMasternodeInfo(formatMasternode(_masternodeInfo)))
        .catch(err => {

        })
    }
  }, [masternodeAppend, masternodeStorageContract]);

  useEffect(() => {
    setNotEnoughError(undefined);
  }, [activeAccount])

  const [params, setParams] = useState<{
    min: number,
    step: number,
    left: number,
    value: number
  }>();
  const [notEnoughError, setNotEnoughError] = useState<string | undefined>();
  const [openAppendModal, setOpenAppendModal] = useState<boolean>(false);

  useEffect(() => {
    if (masternodeInfo) {
      const totalAmount = masternodeInfo.founders.reduce<CurrencyAmount>(
        (totalAmount, founder) => totalAmount = totalAmount.add(founder.amount),
        CurrencyAmount.ether(JSBI.BigInt(0))
      )
      const left = Safe4_Business_Config.Masternode.Create.LockAmount - Number(totalAmount.toFixed(0));
      if (left < Safe4_Business_Config.Masternode.Create.UnionLockAmount / 2) {
        setParams({
          step: 0,
          min: left,
          left,
          value: left
        })
      } else {
        setParams({
          step: Safe4_Business_Config.Masternode.Create.UnionLockAmount / 2,
          min: Safe4_Business_Config.Masternode.Create.UnionLockAmount / 2,
          left,
          value: Safe4_Business_Config.Masternode.Create.UnionLockAmount / 2
        })
      }
    }
  }, [masternodeInfo]);

  const nextClick = () => {
    if (params && params.value) {
      const notEnough = !balance?.greaterThan(CurrencyAmount.ether(ethers.utils.parseEther(params.value + "").toBigInt()))
      if (notEnough) {
        setNotEnoughError("账户内没有足够的SAFE进行锁仓!");
        return;
      }
      setOpenAppendModal(true);
    }
  }

  return <>
    <Row style={{ height: "50px" }}>
      <Col span={8}>
        <Button style={{ marginTop: "14px", marginRight: "12px", float: "left" }} size="large" shape="circle" icon={<LeftOutlined />} onClick={() => {
          navigate("/main/masternodes")
        }} />
        <Title level={4} style={{ lineHeight: "16px", float: "left" }}>
          {t("wallet_masternodes_joins")}
        </Title>
      </Col>
    </Row>

    <div style={{ width: "100%", paddingTop: "40px", minWidth: "1000px" }}>
      <div style={{ margin: "auto", width: "90%" }}>
        {
          params && params.left > 0 && <>
            <Row>
              <Card title={t("wallet_masternodes_joins_title")} style={{ width: "100%", marginBottom: "50px" }}>
                <>
                  <Row>
                    <Col span={24}>
                      <Text type="secondary">{t("wallet_masternodes_joins_left")}</Text>
                    </Col>
                    <Col span={24}>
                      <Text style={{ fontSize: "20px" }} strong>{params?.left} SAFE</Text>
                    </Col>
                  </Row>
                  <Divider style={{ marginTop: "5px", marginBottom: "15px" }} />
                  <Row >
                    <Col span={10}>
                      <Text strong>{t("wallet_masternodes_joins_amount")}</Text>
                      <br />
                      <Text style={{ fontSize: "20px" }} strong>{params?.value} SAFE</Text>
                      {
                        params && params.step > 0 && <Slider
                          step={params.step}
                          defaultValue={params.value}
                          max={params.left}
                          value={params.value}
                          onChange={(val) => {
                            if (!(val < params.min)) {
                              setNotEnoughError(undefined);
                              setParams({
                                ...params,
                                value: val
                              })
                            }
                          }}
                        />
                      }
                      <br />
                      {
                        notEnoughError && <Alert showIcon type='error' message={notEnoughError} style={{ marginBottom: "20px" }} />
                      }
                    </Col>
                    <Col span={14}>
                      <Text type='secondary' style={{ float: "right" }} strong>{t("wallet_balance_currentavailable")}</Text>
                      <br />
                      <Text style={{ float: "right", fontSize: "20px", lineHeight: "36px" }}>
                        {balance?.toFixed(6)} SAFE
                      </Text>
                    </Col>
                  </Row>
                  <Divider style={{ marginTop: "0px" }} />
                  <Spin spinning={activeAccountNodeInfo == undefined}>
                    <Button disabled={activeAccountNodeInfo?.isNode} type='primary' onClick={nextClick}>
                      {t("wallet_masternodes_joins_button")}
                    </Button>
                    {
                      activeAccountNodeInfo?.isNode &&
                      <Alert style={{ marginTop: "5px" }} type='warning' showIcon message={<>
                        {
                          activeAccountNodeInfo.isMN && "已经是主节点"
                        }
                        {
                          activeAccountNodeInfo.isSN && "已经是超级节点"
                        }
                      </>} />
                    }
                  </Spin>
                </>
              </Card>
            </Row>
          </>
        }
        <Row>
          {
            masternodeInfo && <Masternode masternodeInfo={masternodeInfo} />
          }
        </Row>
      </div>
    </div>

    {
      masternodeInfo && params && params.value > 0 && <AppendModalConfirm openAppendModal={openAppendModal} setOpenAppendModal={setOpenAppendModal}
        masternodeInfo={masternodeInfo}
        valueAmount={params?.value}
      />
    }

  </>

}
