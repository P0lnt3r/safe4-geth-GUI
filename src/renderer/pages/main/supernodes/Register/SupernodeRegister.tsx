import { Typography, Row, Col, Button, Card, Divider, Input, Slider, Alert, Radio, Space, Spin, Select } from 'antd';
import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { useActiveAccountChildWallets, useETHBalances, useWalletsActiveAccount, useWalletsActiveKeystore } from '../../../../state/wallets/hooks';
import { useMasternodeStorageContract, useMulticallContract, useSupernodeStorageContract } from '../../../../hooks/useContracts';
import { LeftOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { CurrencyAmount, JSBI } from '@uniswap/sdk';
import { ethers } from 'ethers';
import CreateModalConfirm from './CreateModal-Confirm';
import NumberFormat from '../../../../utils/NumberFormat';
import { Safe4_Business_Config } from '../../../../config';
import CallMulticallAggregate, { CallMulticallAggregateContractCall, SyncCallMulticallAggregate } from '../../../../state/multicall/CallMulticallAggregate';
import SSH2CMDTerminalNodeModal from '../../../components/SSH2CMDTerminalNodeModal';
import AddressComponent from '../../../components/AddressComponent';
import { HDNode } from 'ethers/lib/utils';
import { generateChildWallet, generateMasternodeTypeChildWallets, SupportChildWalletType } from '../../../../utils/GenerateChildWallet';
const { Text, Title } = Typography;

export const Supernode_Create_Type_NoUnion = 1;
export const Supernode_create_type_Union = 2;
export const enodeRegex = /^enode:\/\/[0-9a-fA-F]{128}@(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d+)$/;

export const InputRules = {
  name: {
    min: 2,
    max: 20
  },
  description: {
    min: 12,
    max: 600
  }
}

export default () => {

  const navigate = useNavigate();
  const supernodeStorageContract = useSupernodeStorageContract();
  const masternodeStorageContract = useMasternodeStorageContract();
  const multicallContract = useMulticallContract();
  const activeAccount = useWalletsActiveAccount();
  const balance = useETHBalances([activeAccount])[activeAccount];
  const [enodeTips, setEnodeTips] = useState<boolean>(false);
  const [checking, setChecking] = useState<boolean>(false);

  const [openSSH2CMDTerminalNodeModal, setOpenSSH2CMDTerminalNodeModal] = useState<boolean>(false);
  const [nodeAddressPrivateKey, setNodeAddressPrivateKey] = useState<string>();
  const [nodeAddress, setNodeAddress] = useState<string>();
  const [generateChild, setGenerateChild] = useState<boolean>(false);
  const walletsActiveKeystore = useWalletsActiveKeystore();
  const activeAccountChildWallets = useActiveAccountChildWallets(SupportChildWalletType.SN);

  const [helpResult, setHelpResult] = useState<
    {
      enode: string,
      nodeAddress: string
    }
  >();
  const [createParams, setCreateParams] = useState<{
    createType: number | 1,
    name: string | undefined,
    address: string | undefined,
    enode: string | undefined,
    description: string | undefined,
    incentivePlan: {
      creator: number,
      partner: number,
      voter: number
    }
  }>({
    createType: Supernode_Create_Type_NoUnion,
    name: undefined,
    address: undefined,
    enode: undefined,
    description: undefined,
    incentivePlan: {
      creator: 10,
      partner: 45,
      voter: 45
    }
  });
  const [sliderVal, setSliderVal] = useState<number[]>([45, 55]);
  const [inputErrors, setInputErrors] = useState<{
    name: string | undefined,
    enode: string | undefined,
    description: string | undefined,
    balance: string | undefined,
    address: string | undefined
  }>({
    name: undefined,
    enode: undefined,
    description: undefined,
    balance: undefined,
    address: undefined
  });

  const nextClick = () => {
    const { name, enode, description, incentivePlan, address } = createParams;
    incentivePlan.partner = sliderVal[0];
    incentivePlan.creator = sliderVal[1] - sliderVal[0];
    incentivePlan.voter = 100 - sliderVal[1];
    if (!name) {
      inputErrors.name = "请输入超级节点名称!";
    };
    if (name && (name.length < InputRules.name.min || name.length > InputRules.name.max)) {
      inputErrors.name = `字符长度需要大于${InputRules.name.min}且小于${InputRules.name.max}`;
    }
    if (!enode) {
      inputErrors.enode = "请输入超级节点ENODE!";
    } else {
      const isMatch = enodeRegex.test(enode);
      if (!isMatch) {
        inputErrors.enode = "超级节点ENODE格式不正确!";
      }
    }
    if (!address) {
      inputErrors.address = "请输入超级节点地址";
    } else {
      try {
        if (!ethers.utils.isAddress(address)) {
          inputErrors.address = "请输入合法的钱包地址";
        }
        if (address == activeAccount) {
          inputErrors.address = "不能使用当前账户作为超级节点地址";
        }

      } catch (error) {
        inputErrors.address = "请输入合法的钱包地址";
      }

    }
    if (!description) {
      inputErrors.description = "请输入超级节点简介信息!"
    };
    if (description && (description.length < InputRules.description.min || description.length > InputRules.description.max)) {
      inputErrors.description = `简介信息长度需要大于${InputRules.description.min}且小于${InputRules.description.max}`;
    }

    if (createParams.createType == Supernode_Create_Type_NoUnion
      && !balance?.greaterThan(CurrencyAmount.ether(JSBI.BigInt(ethers.utils.parseEther(Safe4_Business_Config.Supernode.Create.LockAmount + ""))))) {
      inputErrors.balance = "账户余额不足以支付超级节点创建费用";
    }
    if (createParams.createType == Supernode_create_type_Union
      && !balance?.greaterThan(CurrencyAmount.ether(JSBI.BigInt(ethers.utils.parseEther(Safe4_Business_Config.Supernode.Create.UnionLockAmount + ""))))) {
      inputErrors.balance = "账户余额不足以支付超级节点创建费用";
    }
    if (inputErrors.name || inputErrors.enode || inputErrors.description || inputErrors.balance || inputErrors.address) {
      setInputErrors({ ...inputErrors });
      return;
    }
    if (supernodeStorageContract && masternodeStorageContract && multicallContract) {
      /**
       * function existName(string memory _name) external view returns (bool);
       * function existEnode(string memory _enode) external view returns (bool);
       */
      setChecking(true);
      const nameExistCall: CallMulticallAggregateContractCall = {
        contract: supernodeStorageContract,
        functionName: "existName",
        params: [name],
      };
      const addrExistCall: CallMulticallAggregateContractCall = {
        contract: supernodeStorageContract,
        functionName: "exist",
        params: [address]
      }
      const addrExistInMasternodesCall: CallMulticallAggregateContractCall = {
        contract: masternodeStorageContract,
        functionName: "exist",
        params: [address]
      }
      const enodeExistCall: CallMulticallAggregateContractCall = {
        contract: supernodeStorageContract,
        functionName: "existEnode",
        params: [enode]
      }
      const enodeExistInMasternodeCall: CallMulticallAggregateContractCall = {
        contract: masternodeStorageContract,
        functionName: "existEnode",
        params: [enode]
      }
      CallMulticallAggregate(
        multicallContract,
        [nameExistCall, addrExistCall, addrExistInMasternodesCall, enodeExistCall, enodeExistInMasternodeCall],
        () => {
          const nameExists: boolean = nameExistCall.result;
          const addrExists: boolean = addrExistCall.result;
          const addrExistsInMasternodes: boolean = addrExistInMasternodesCall.result;
          const enodeExists: boolean = enodeExistCall.result;
          const enodeExistsInMasternodes: boolean = enodeExistInMasternodeCall.result;
          if (nameExists) {
            inputErrors.name = "该名称已被使用";
          }
          if (addrExists || addrExistsInMasternodes) {
            inputErrors.address = "该地址已被使用";
          }
          if (enodeExists || enodeExistsInMasternodes) {
            inputErrors.enode = "该ENODE已被使用";
          }
          setChecking(false);
          if (nameExists || enodeExists || enodeExistsInMasternodes || addrExists || addrExistsInMasternodes) {
            setInputErrors({ ...inputErrors });
            return;
          }
          setOpenCreateModal(true);
        }
      )
    }
  }
  const [openCreateModal, setOpenCreateModal] = useState<boolean>(false);

  useEffect(() => {
    if (!walletsActiveKeystore || !walletsActiveKeystore.mnemonic) {
      // 告知用户不可使用该界面;
    }
    setCreateParams({
      ...createParams,
      address: undefined,
      enode: undefined
    });
    setInputErrors({
      ...inputErrors,
      balance: undefined,
      address: undefined
    });
    // 清楚使用 ssh 连接后做的数据
    setNodeAddress(undefined);
    setNodeAddressPrivateKey(undefined);
    setHelpResult(undefined);
  }, [walletsActiveKeystore]);

  const selectChildWalletOptions = useMemo(() => {
    if (activeAccountChildWallets) {
      const options = Object.keys(activeAccountChildWallets.wallets)
        .map(childAddress => {
          const { path, exist } = activeAccountChildWallets.wallets[childAddress];
          return {
            address: childAddress,
            path,
            exist,
            index: path.substring(Number(path.lastIndexOf("/") + 1))
          }
        })
        .sort((a: any, b: any) => (a.index - b.index))
        .map(({ address, path, exist, index }) => {
          return {
            value: address,
            label: <>
              <Row key={address}>
                <Col span={18}>
                  <AddressComponent ellipsis address={address} />
                </Col>
                <Col span={6} style={{ textAlign: "right" }}>
                  <Text>{path}</Text>
                </Col>
              </Row>
            </>,
            disabled: exist
          }
        })
      return options;
    }
  }, [activeAccount, activeAccountChildWallets]);

  // 子钱包加载后,自动设置可用的第一个子钱包作为默认选择;
  useEffect(() => {
    if (!createParams.address && selectChildWalletOptions) {
      const couldSelect = selectChildWalletOptions.filter(option => !option.disabled);
      if (couldSelect && couldSelect.length > 0) {
        setCreateParams({
          ...createParams,
          address: couldSelect[0].value
        })
      }
    }
  }, [createParams, selectChildWalletOptions])

  const helpToCreate = useCallback(() => {
    if (createParams.address && activeAccountChildWallets && activeAccountChildWallets.wallets[createParams.address]
      && walletsActiveKeystore?.mnemonic
    ) {
      const path = activeAccountChildWallets.wallets[createParams.address].path;
      const hdNode = generateChildWallet(
        walletsActiveKeystore.mnemonic,
        walletsActiveKeystore.password ? walletsActiveKeystore.password : "",
        path
      );
      setNodeAddress(hdNode.address);
      setNodeAddressPrivateKey(hdNode.privateKey);
      setOpenSSH2CMDTerminalNodeModal(true);
    }
  }, [createParams, walletsActiveKeystore, activeAccountChildWallets]);

  return <>
    <Row style={{ height: "50px" }}>
      <Col span={8}>
        <Button style={{ marginTop: "14px", marginRight: "12px", float: "left" }} size="large" shape="circle" icon={<LeftOutlined />} onClick={() => {
          navigate("/main/supernodes")
        }} />
        <Title level={4} style={{ lineHeight: "16px", float: "left" }}>
          创建超级节点
        </Title>
      </Col>
    </Row>

    <Row style={{ marginTop: "20px", width: "100%" }}>
      <Card style={{ width: "100%" }}>
        <div style={{ width: "50%", margin: "auto" }}>

          <Row style={{ marginTop: "20px", marginBottom: "20px" }}>
            <Col span={24}>
              <Alert type='info' showIcon message={
                <>
                  <Row>
                    <Col span={24}>
                      <Text>
                        已有服务器,也可以选择通过 SSH 登陆来辅助创建超级节点.
                      </Text>
                      <Button onClick={() => {
                        helpToCreate();
                      }} type='primary' size='small' style={{ float: "right" }}>辅助创建</Button>
                    </Col>
                  </Row>
                </>
              }></Alert>
            </Col>
          </Row>

          <Row>
            <Col span={24}>
              <Text type='secondary'>创建模式</Text><br />
              <Radio.Group onChange={(e) => {
                setInputErrors({
                  ...inputErrors,
                  balance: undefined
                })
                setCreateParams({
                  ...createParams,
                  createType: e.target.value
                })
              }} value={createParams.createType}>
                <Space direction="horizontal">
                  <Radio value={1}>独立</Radio>
                  <Radio value={2}>众筹</Radio>
                </Space>
              </Radio.Group>
            </Col>
          </Row>
          <br />
          <Row>
            <Col span={12} style={{ textAlign: "left" }}>
              <Text type='secondary'>锁仓</Text><br />
              {
                createParams.createType == Supernode_Create_Type_NoUnion &&
                <Text strong>{NumberFormat(Safe4_Business_Config.Supernode.Create.LockAmount)} SAFE</Text>
              }
              {
                createParams.createType == Supernode_create_type_Union &&
                <Text strong>{NumberFormat(Safe4_Business_Config.Supernode.Create.UnionLockAmount)} SAFE</Text>
              }
              <br />
            </Col>
            <Col span={12} style={{ textAlign: "right" }}>
              <Text type='secondary'>账户当前余额</Text><br />
              <Text type='secondary'>{balance?.toFixed(6)} SAFE</Text><br />
            </Col>
            <Col span={24}>
              {
                inputErrors && inputErrors.balance &&
                <Alert style={{ marginTop: "5px" }} type='error' message={inputErrors.balance} showIcon></Alert>
              }
            </Col>
          </Row>
          <Divider />
          <Row>
            <Col span={24}>
              <Text type='secondary'>超级节点地址</Text>
              <Alert style={{ marginTop: "5px", marginBottom: "5px" }} type='warning' showIcon message={<>
                <Row>
                  <Col span={24}>
                    超级节点运行时,节点程序需要加载超级节点地址的私钥来签名区块.
                  </Col>
                  <Col span={24}>
                    钱包通过当前账户的种子密钥生成子地址作为超级节点地址.
                  </Col>
                  <Col span={24}>
                    由于该超级节点的私钥会被远程存放在您的节点服务器上,<Text type='danger' strong>请避免向这个超级节点地址进行资产转账.</Text>
                  </Col>
                </Row>
              </>} />
              <Row>
                <Col span={24}>
                  <Select
                    style={{
                      width: "100%"
                    }}
                    placeholder="正在加载可用的超级节点地址..."
                    options={selectChildWalletOptions}
                    disabled={helpResult ? true : false}
                    onChange={(value) => {
                      setCreateParams({
                        ...createParams,
                        address: value
                      })
                    }}
                    value={createParams.address}
                  />
                  {
                    inputErrors && inputErrors.address &&
                    <Alert style={{ marginTop: "5px" }} type='error' message={inputErrors.address} showIcon></Alert>
                  }
                </Col>
              </Row>

            </Col>
          </Row>
          <Divider />
          <Row>
            <Col span={24}>
              <Text type='secondary'>名称</Text>
              <Input status={inputErrors.name ? "error" : ""}
                value={createParams.name} placeholder='输入超级节点名称' onChange={(event) => {
                  const inputName = event.target.value;
                  setInputErrors({
                    ...inputErrors,
                    name: undefined
                  })
                  setCreateParams({
                    ...createParams,
                    name: inputName
                  });
                }}></Input>
              {
                inputErrors && inputErrors.name &&
                <Alert style={{ marginTop: "5px" }} type='error' message={inputErrors.name} showIcon></Alert>
              }
            </Col>
          </Row>
          <Divider />
          <Row>
            <Col span={24}>
              <QuestionCircleOutlined onClick={() => setEnodeTips(true)} style={{ cursor: "pointer", marginRight: "5px" }} /><Text type='secondary'>ENODE</Text>
            </Col>
            {
              enodeTips && <Col span={24} style={{ marginBottom: "10px", marginTop: "5px" }}>
                <Alert type='info' message={<>
                  <Text>服务器上部署节点程序后,连接到节点终端输入</Text><br />
                  <Text strong code>admin.nodeInfo</Text><br />
                  获取节点的ENODE信息
                </>} />
              </Col>
            }
            <Input.TextArea style={{ height: "100px" }} status={inputErrors.enode ? "error" : ""}
              disabled={helpResult ? true : false}
              value={createParams.enode} placeholder='输入超级节点ENODE' onChange={(event) => {
                const inputEnode = event.target.value;
                setInputErrors({
                  ...inputErrors,
                  enode: undefined
                })
                setCreateParams({
                  ...createParams,
                  enode: inputEnode
                })
              }}></Input.TextArea>
            {
              inputErrors && inputErrors.enode &&
              <Alert style={{ marginTop: "5px" }} type='error' message={inputErrors.enode} showIcon></Alert>
            }
          </Row>
          <Divider />
          <Row>
            <Text type='secondary'>简介</Text>
            <Input status={inputErrors.description ? "error" : ""}
              value={createParams.description} placeholder='请输入超级节点简介信息' onChange={(event) => {
                const inputDescription = event.target.value;
                setInputErrors({
                  ...inputErrors,
                  description: undefined
                })
                setCreateParams({
                  ...createParams,
                  description: inputDescription
                })
              }}></Input>
            {
              inputErrors && inputErrors.description &&
              <Alert style={{ marginTop: "5px" }} type='error' message={inputErrors.description} showIcon></Alert>
            }
          </Row>
          <Divider />
          <Row>
            <Text type='secondary'>挖矿奖励分配方案</Text>
            <br />
            <Slider style={{ width: "100%" }}
              range={{ draggableTrack: true }}
              value={sliderVal}
              onChange={(result: number[]) => {
                const left = result[0];
                const right = result[1];
                if (left >= 40 && left <= 50 && right >= 50 && right <= 60 && (right - left) <= 10) {
                  setSliderVal(result)
                }
              }}
            />
            <br />
            <Row style={{ width: "100%" }}>
              <Col span={8} style={{ textAlign: "left" }}>
                <Text strong>合伙人</Text><br />
                <Text>{sliderVal[0]} %</Text>
              </Col>
              <Col span={8} style={{ textAlign: "center" }}>
                <Text strong>创建者</Text><br />
                <Text>{sliderVal[1] - sliderVal[0]}%</Text>
              </Col>
              <Col span={8} style={{ textAlign: "right" }}>
                <Text strong>投票人</Text><br />
                <Text>{100 - sliderVal[1]} %</Text>
              </Col>
            </Row>
          </Row>
          <Divider />

          <Row style={{ width: "100%", textAlign: "right" }}>
            <Col span={24}>
              <Button loading={checking} type="primary" onClick={() => {
                nextClick();
              }}>下一步</Button>
            </Col>
          </Row>
        </div>
      </Card>
    </Row>

    {
      createParams.name && createParams.enode && createParams.description &&
      <CreateModalConfirm openCreateModal={openCreateModal} setOpenCreateModal={setOpenCreateModal} createParams={createParams} />
    }

    {
      nodeAddressPrivateKey && openSSH2CMDTerminalNodeModal && nodeAddress &&
      <SSH2CMDTerminalNodeModal openSSH2CMDTerminalNodeModal={openSSH2CMDTerminalNodeModal} setOpenSSH2CMDTerminalNodeModal={setOpenSSH2CMDTerminalNodeModal}
        nodeAddressPrivateKey={nodeAddressPrivateKey}
        nodeAddress={nodeAddress}
        onSuccess={(enode: string, nodeAddress: string) => {
          setHelpResult({ enode, nodeAddress });
          setCreateParams({
            ...createParams,
            address: nodeAddress,
            enode
          });
          setInputErrors({
            ...inputErrors,
            address: undefined,
            enode: undefined
          })
        }}
        onError={() => {

        }} />
    }

  </>

}
