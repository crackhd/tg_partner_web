/* global BigInt */

import React from 'react';
import './App.css';
import { InputGroup, FormControl, Jumbotron, Button, Alert, Row, Col, Table, Card, ListGroup, Badge } from 'react-bootstrap';
import { UncontrolledTooltip } from 'reactstrap';
import { web3, contract, usdToEther, etherToUsd } from './Reward.jsx';
import Web3 from 'web3';
import etherLogo from'./ether.svg';
import JavascriptTimeAgo from 'javascript-time-ago';
import ReactTimeAgo from 'react-time-ago';

import en from 'javascript-time-ago/locale/en';
import ru from 'javascript-time-ago/locale/ru';

JavascriptTimeAgo.addLocale(en);
JavascriptTimeAgo.addLocale(ru);

const exampleRewardPoints = [ 15, 50, 100, 300, 450, 800, 1000, 15000 ];
const CHALLENGE_FLAGS_DEFAULT = 256;

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
        contract: null,
        web3Ready: false,

        durationMinutes: 500,
        rubyToEther: 0,
        totalSupplyUsd: 0,
        totalSupply: 0,
        totalBankUsd: 0,
        totalBank: 0,
        balanceEther: 0,

        examples: [],
        challenges: [],

        myBalanceRuby: 0,
        myBalanceUsd: 0,

        inputSell: "",
        inputURL: "",
        inputBot: "",
        inputBotAuth: false,

        ceo: "",
        user: "",
        rules: [],
        settings: {
            ceoDurationMinutes: 500,
            ceoServiceCostsOn: 1,
            ceoTimeoutMinutes: 10,
            ceoWeiPerToken: 10000,
            ceoMinBankForChallenge: 15,
        },
    };
  }

   componentDidMount() {
        window.addEventListener('load', this.onCompleted.bind(this));
     }

     onCompleted() {
         web3.eth.getAccounts().then(this.updateContract.bind(this));
     }

  updateInputSell(evt) {
    this.setState({
      inputSell: evt.target.value
    });
}

    updateInputURL(evt) {
      this.setState({
        inputURL: evt.target.value
      });
    }

  async newChallenge() {
      if (this.state.inputURL == "") {
          return;
      }

      let parsed = this.state.inputURL.toLowerCase().match(/([^\/\?]+)/g);
      if (parsed.length != 4 || parsed[0] != "https:" || parsed[1] != "t.me") {
          alert("Invalid URL");
          return;
      }

      let [_1, _2, group, postId] = parsed;
      if (group.length < 4 || group.length > 32) {
          alert("Invalid URL (invalid group)");
          return;
      }

      let resourceId = parseInt(postId, 10);

      if (isNaN(resourceId)) {
          alert("Invalid URL (invalid post id)");
          return;
      }

      let ctr = await contract();
      let self = this;

      let accounts = await web3.eth.requestAccounts();

      if(accounts.length == 0) {
          alert('Не вижу аккаунты Ethereum!');
          return;
      }
      let account = accounts[0];
      await ctr.methods.newChallenge(group, resourceId, CHALLENGE_FLAGS_DEFAULT).send({from: account, value: 0, gaslimit: 100000});
      this.setState({
          inputURL: ""
      });
  }

    async sell() {
      let accounts = await web3.eth.requestAccounts();
      if(accounts.length == 0) {
          alert('Не вижу аккаунты Ethereum!');
          return;
      }
      let account = accounts[0];
      let ctr = await contract();
      let t = ctr.methods.sell(this.state.inputSell);
      await this.transact(ctr, t);
      this.setState({
          inputURL: ""
      });
    }

  async loadExamples() {
      var examples = [];

      let ctr = await contract();

      for(var i = 0; i < exampleRewardPoints.length; i++) {
          let points = exampleRewardPoints[i];
          let reward = Number(BigInt(await ctr.methods.rewardForPoints(points).call()));
          examples.push({
              views: points,
              rubys: reward,
              ether: reward * this.state.rubyToEther,
              usd: reward * this.state.rubyToEther * etherToUsd,
          });
      }

      this.setState({
          examples: examples,
      });
  }

  async updateContract() {

      let self = this;
      let accounts = await web3.eth.getAccounts();

      if(accounts.length == 0) {
          console.log('Не вижу аккаунты Ethereum!');
          return
      }

      let ctr = await contract();

      let duration = Number(await ctr.methods.duration().call()) / 60;
      let weiPerToken = BigInt(await ctr.methods.weiPerToken().call());
      let totalSupply = BigInt(await ctr.methods.totalSupply().call());

      let rubyToEther = Number(Web3.utils.fromWei(weiPerToken.toString(), 'ether'));

      let balanceEther = rubyToEther * Number(totalSupply);

      let user = accounts[0];
      let userBalance = Number(BigInt(await ctr.methods.balanceOf(user).call()));
      let userBalanceEther = (userBalance * rubyToEther).toFixed();

      let ceo = await ctr.methods.ceo().call();
      let minBankForChallenge = Number(await ctr.methods.minBankForChallenge().call());
      let serviceCostsEnabled = Number(await ctr.methods.serviceCostsEnabled().call());
      let requestTimeout = Number(await ctr.methods.requestTimeout().call());

      var totalBank = BigInt(await ctr.methods.totalBank().call());
      if(totalBank > 0) {
          totalBank = Number(totalBank);
      } else {
          totalBank = 0;
      }

      this.setState({
          web3Ready: true,
          user: user,
          ceo: ceo,
          balanceEther: balanceEther,
          durationMinutes: Number(duration),
          rubyToEther: rubyToEther,
          totalSupply: Number(totalSupply),
          totalSupplyUsd: Number(totalSupply) * rubyToEther * etherToUsd,
          totalBank: totalBank,
          totalBankUsd: totalBank * rubyToEther * etherToUsd,
          myBalanceRuby: userBalance,
          myBalanceUsd: userBalance * rubyToEther * etherToUsd,
          settings: {
              ceoDurationMinutes: Number(duration),
              ceoMinBankForChallenge: Number(minBankForChallenge),
              ceoServiceCostsOn: serviceCostsEnabled,
              ceoWeiPerToken: Number(weiPerToken),
              ceoTimeoutMinutes: Number(requestTimeout / 60),
          },
          inputBot: ceo,
      }, async () => {
           await self.loadChallenges();
           self.loadExamples();

           if (self.isCEO())
               await self.loadRules();
      })
  }

  async loadRules() {
      let ctr = await contract();
      let rules = [];

      let numberOfRules = Number(await ctr.methods.numberOfRules().call());

      for (var i = 0; i < numberOfRules; i++) {
          let r = await ctr.methods.getRule(i).call();
          rules.push({
              threshold:        Number(r[0]),
              rewardForPoint:   Number(r[1]),
          });
      }

      console.log(JSON.stringify({rulesLoaded: rules}));

      this.setState({
          rules: rules,
      });
  }

  examplesCardColumn(start, end) {
      return (<Col md={{ span: 5, offset: start % 4 != 0 ? 0 : 1 }}>
          <Card>
            <ListGroup variant="flush">
              <ListGroup.Item>
                    {this.state.examples.slice(start, end).map(this.exampleCardItemUI.bind(this))}
              </ListGroup.Item>
            </ListGroup>
          </Card>
      </Col>);
  }

  statusAndTip(key, status, error) {
      switch (parseInt(status, 10)) {
          case 1:
            return (<span id={"statustip-"+key}>
                Не подтверждена ﹖
                <UncontrolledTooltip placement="right" target={"statustip-"+key}>
      Подождите, пока бот получит информацию о посте и подтвердит кампанию.
    </UncontrolledTooltip>
            </span>);
            case 2:
              return (<span id={"statustip-"+key}>
                  <strong>Запущена</strong> ﹖
                  <UncontrolledTooltip placement="right" target={"statustip-"+key}>
        Верифицирована ботом. Начальное количество хитов зафиксировано. Теперь необходимо провести кампанию до истечния срока.
      </UncontrolledTooltip>
              </span>);
          case 3:
            return (<span id={"statustip-"+key}>
                Завершена ﹖
                <UncontrolledTooltip placement="right" target={"statustip-"+key}>
      Подошла к концу, количество долитых просмотров зафиксировано, награда была начислена на баланс создателя кампании.
    </UncontrolledTooltip>
            </span>);
        case 4:
          return (<span id={"statustip-"+key}>
              Ошибка ﹖
              <UncontrolledTooltip placement="right" target={"statustip-"+key}>
    Произошла ошибка и кампания была прервана. Награда не будет начислена.
    Бот передал: <code>{error}</code>
  </UncontrolledTooltip>
          </span>);
      case 5:
        return (<span id={"statustip-"+key}>
            Тайм-аут ﹖
            <UncontrolledTooltip placement="right" target={"statustip-"+key}>
Отмечена как неудавшаяся из-за отсутстия реакции со стороны бота в понятные рамки.
</UncontrolledTooltip>
        </span>);
          default: // STATUS_INVALID, etc
            return (<span id={"statustip-"+key}>
                !UNKNOWN! ﹖
                <UncontrolledTooltip placement="right" target={"statustip-"+key}>
      Этот статус не должен быть появится в нормальных условиях
    </UncontrolledTooltip>
            </span>);
      }
  }

  async loadChallenges() {
    let ctr = await contract();
    let numChallenges = Number(await ctr.methods.numChallenges().call());

      let challenges = [];

      for (var i = numChallenges - 1; i > numChallenges - 10 && i >= 0; i--) {
            let data = await ctr.methods.challenges(i).call();

            var timestamp = Number(data.createdAt);
            if (data.data.status == 2) {
                timestamp = Number(data.data.confirmedAt) + this.state.durationMinutes * 60;
            }

            challenges.push({
                time: timestamp,
                resource: Number(data.resource),
                group: data.group,
                status: Number(data.data.status),
                reward: Number(data.data.reward),
                before: Number(data.data.pointsBefore),
                after: Number(data.data.pointsAfter),
                error: data.data.error,
            });
      }

      this.setState({
          challenges: challenges
      });
  }

  initWeb3() {
      let self = this;
      web3.eth.requestAccounts().then(function(accounts) {
          if(accounts.length == 0) {
              alert('Не вижу аккаунты Ethereum!');
              return;
          }

          self.updateContract();
      });
  }

  allowedSell() {
      let allowance = this.state.balanceEther
      let ether = this.state.myBalanceRuby * this.state.rubyToEther;
      if (ether > allowance) {
          return (allowance / this.state.rubyToEther).toFixed(0);
      }
      return this.state.myBalanceRuby;
  }

  allowedSellUsd() {
      let allowanceRubys = this.allowedSell();
      return allowanceRubys * this.state.rubyToEther * etherToUsd;
  }

  tooltipsUI() {
      return (<div>

      <Alert variant="warning">
        Поддерживаются браузеры Chrome или Firefox на десктопе
      </Alert>
      <Alert variant="info">
        Для пользования смарт-контрактами в браузере необходимо расширение <a href="https://metamask.io" target="_blank"><strong>Metamask</strong></a>
      </Alert>

      <div style={{height: '24px'}}></div>
      </div>)
  }


  newChallengeUI() {
      return (<Jumbotron>

          <h3>Начать кампанию по посту</h3>

          <InputGroup className="mb-3">

          <FormControl
            disabled={!this.state.web3Ready}
            placeholder="https://t.me/channel/123"
            aria-label="Telegram post URL"
            value={this.state.inputURL}
            onChange={evt => this.updateInputURL(evt)}

          />
          <InputGroup.Append>
            <Button variant="primary" id="basic-addon2" disabled={!this.state.web3Ready} onClick={this.newChallenge.bind(this)}>New Challenge</Button>
          </InputGroup.Append>
          </InputGroup>

          </Jumbotron>);
  }

  statusUI() {
      return (<div>
          <div style={{height: '24px'}}></div>

          <h3>Состояние контракта</h3>

              <div style={{height: '7px'}}></div>

              <Card>
                <ListGroup variant="flush">
                  <ListGroup.Item>Общий банк ~ <strong>${this.state.totalSupplyUsd.toFixed(0)}</strong> (💎{this.state.totalSupply})</ListGroup.Item>
                  <ListGroup.Item>Свободный банк ~ <strong>${this.state.totalBankUsd.toFixed(0)}</strong> (💎{this.state.totalBank})</ListGroup.Item>
                </ListGroup>
              </Card>
      </div>)
  }

  ETH() {
      return (<img src={etherLogo} title="Ethereum (ETH)" alt="ETH" viewport="0 0 16 16" style={{width: 16, height: 16}}/>);
  }

  exampleCardItemUI(example, i) {
      return (<div key={i}>

          &nbsp;&nbsp;&nbsp;&nbsp;за {example.views} просмотров:<br/>
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;=&nbsp;💎 {example.rubys}<br/>
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;=&nbsp;{this.ETH()} <strong>{example.ether}</strong><br/>
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;=&nbsp;~&nbsp;<strong>${example.usd.toFixed(4)}</strong><br/><br/>
          </div>);
  }

  quotesUI() {
      return (<div>

          <div style={{height: '24px'}}></div>

          <Row>
            <Col md={{span: 10, offset: 1}}>
            <h3>Калькулятор</h3>
                <p>&nbsp;&nbsp;&nbsp;&nbsp;$1&nbsp;=&nbsp;{this.ETH()} {usdToEther} (💎{usdToEther / this.state.rubyToEther})<br/><br/></p>
            </Col>
          </Row>

                    <Alert id="calculator">
                                        Награда вычисляется на основе добавленных просмотров за время работы кампании.
                                        Посмотрите реальные расчеты по некоторым конкретным результатам кампаний:

                                        <UncontrolledTooltip target="calculator">

                                            У вознаграждений есть коэффициент, меняющийся с ростом просмотров
                                            для предотвращения неэффективного расхода бюджета партнерки (банка).
                                        </UncontrolledTooltip>
                                        </Alert>

          <div style={{height: '7px'}}></div>

          <Row>

              {this.examplesCardColumn(0, 2)}
              {this.examplesCardColumn(2, 4)}

          </Row>

            <Row style={{height: '14px'}}></Row>

          <Row>
              {this.examplesCardColumn(4, 6)}
              {this.examplesCardColumn(6, 8)}
          </Row>

      </div>)
  }

  tableUI() {
      return (<Row>
      <Col md={{ span: 10, offset: 1 }}>
      <h2>Последние кампании</h2>

          <Button variant="success" onClick={this.updateContract.bind(this)} disabled={!this.state.web3Ready}>обновить</Button>

          <div style={{height: '7px'}}></div>

              <Table striped bordered hover size="sm">
                  <thead>
                  <tr>
                    <th>Статус</th>
                    <th>Канал</th>
                    <th>Пост</th>
                    <th>Время</th>
                    <th>До / после</th>
                    <th>Награда</th>
                  </tr>
                  </thead>
                  <tbody>
                  {this.state.challenges.map((challenge, i) => {
                  // Return the element. Also pass key
                  return (<tr key={i}>
                    <td>{this.statusAndTip(i, challenge.status, challenge.error)}</td>
                    <td>{challenge.group}</td>
                    <td>{challenge.resource}</td>
                    <td><ReactTimeAgo date={new Date(challenge.time*1000)} locale="ru" /></td>
                    <td>
                        {challenge.before} / {challenge.after}
                    </td>
                    <td>
                        {challenge.status > 1
                            ? (<span>💎{challenge.reward} <strong>~ ${(challenge.reward * this.state.rubyToEther * etherToUsd).toFixed(2)}</strong></span>)
                            : null
                        }
                    </td>
                  </tr>)
                  })}
                  </tbody>
                  </Table>

              { this.state.challenges.length == 0
                  ? (<span>Нет недавних кампаний</span>)
                  : null
              }



              { this.state.challenges.length > 10
                  ? (<Button variant="success" onClick={this.updateContract.bind(this)}>обновить</Button>)
                  : null
              }
      </Col>
      </Row>);
  }

  sellUI () {
      return (<Row>
      <Col md={6}>
        <Jumbotron>
      <h2>Вывести деньги</h2>
                  <Card>
                    <ListGroup variant="flush">
                        <ListGroup.Item>Установлен курс, 💎 1 = <strong>{this.ETH()} {this.state.rubyToEther}</strong></ListGroup.Item>
                      </ListGroup>
                      <ListGroup.Item>
                        Ваш баланс ~ <strong><Badge variant="info">💎{this.state.myBalanceRuby}</Badge></strong> (${this.state.myBalanceUsd.toFixed(1)})
                      </ListGroup.Item>
                    <ListGroup.Item>
                      Доступно для вывода ~ <strong><Badge variant="success">💎{this.allowedSell()}</Badge></strong> (${this.allowedSellUsd().toFixed(1)})
                    </ListGroup.Item>
                      </Card>


          <div style={{height: '7px'}}></div>
      <InputGroup className="mb-3">
        <InputGroup.Prepend>
        Сколько выводим? &nbsp;&nbsp;
          </InputGroup.Prepend>
        <InputGroup.Prepend>
          <InputGroup.Text>💎</InputGroup.Text>
        </InputGroup.Prepend>
        <FormControl aria-label="Вывести деньги (в рубинах)" value={this.state.inputSell} onChange={evt => this.updateInputSell(evt)} disabled={!this.state.web3Ready} />
        <InputGroup.Append>
          <Button variant="primary" onClick={this.sell.bind(this)} disabled={!this.state.web3Ready}>Sell</Button>
        </InputGroup.Append>
      </InputGroup>
        </Jumbotron>
      </Col>


      <Col md={6}>
      <Alert variant="secondary">
          <p>Для создания кампаний потребуется изначально закинуть немного {this.ETH()}  на своей кошелек
          для оплаты расходов на <i>gas</i>.</p>

          <p>Покупки на $4 должно хватить, что бы множество раз создавать кампании.</p>

          <p>Купить эфир на кошелек можно с помощью кнопки <strong>Deposit</strong> в окне Metamask.</p>
      </Alert>
      <Alert variant="info">
          <p><i>
              Смарт-контракт не может узнавать, сколько просмотров приросло к посту внутри Telegram, сам. </i></p>

          <p>
          Потому в облаке работает робот, который предоставляет смарт-контракту эти самые данные по просмотрам,
          когда вы запускаете кампании.
          </p>
      </Alert>


      </Col>

      </Row>);
  }

  isCEO() {
      return this.state.user == this.state.ceo && this.state.ceo.length > 10;
  }

  settings(key, value) {
      this.state.settings[key] = value;
      this.setState({
          settings: this.state.settings,
      });
  }

  addRule() {
      let rules = this.state.rules;
      rules.unshift({
          threshold: "",
          rewardForPoint: "",
          group: "",
      });
      this.setState({
          rules: rules,
      });
  }

  async removeRule(index) {
      let rules = this.state.rules;
      rules.splice(index, 1);
      this.setState({
          rules: rules,
      });
  }

  changeRule(index, key, val) {
      let rules = this.state.rules;
      rules[index][key] = val;
      this.setState({
          rules: rules,
      });
  }

  ceoUI() {
      return (<div>
          <Row style={{height: '84px'}}></Row>

          <Row>
              <Col md={6}>
                <h3>Reward Rules <span onClick={this.addRule.bind(this)}>➕</span></h3>

                <Table striped bordered hover size="sm">
                    <thead>
                    <tr>
                        <th></th>
                      <th>Points Above</th>
                      <th>Reward for point</th>
                    </tr>
                    </thead>
                    <tbody>
                    {this.state.rules.map((rule, i) => {
                    return (<tr key={i}>
                        <td>
                                            <span onClick={() => this.removeRule(i)} title="Убрать строку правил">➖</span>
                            </td>
                      <td>
                          <FormControl
                              placeholder="threshold"
                              aria-label="threshold"
                              value={rule.threshold}
                              onChange={evt => this.changeRule(i, 'threshold', evt.target.value)}
                            />
                        </td>
                      <td>
                      <FormControl
                          placeholder="rewardForPoint"
                          aria-label="rewardForPoint"
                          value={rule.rewardForPoint}
                          onChange={evt => this.changeRule(i, 'rewardForPoint', evt.target.value)}
                        />
                      </td>
                    </tr>)
                    })}
                    </tbody>
                    </Table>


                        <Button variant="danger" id="basic-addon2" onClick={this.ceoUpdateRules.bind(this)}>Save rules</Button>

              </Col>

              <Col md={6}>
                    <h3>Bot Authorization</h3>


                    <InputGroup
                    >

                    <InputGroup.Checkbox
                        id="bot-enabled"
                        aria-label="Authorize"
                        checked={this.state.inputBotAuth}
                        onChange={evt => this.setState({inputBotAuth: evt.target.checked})}
                     />

                    <FormControl
                        id="bot-addr"
                        placeholder="bot address"
                        aria-label="bot address"
                        value={this.state.inputBot}
                        onChange={evt => this.setState({inputBot: evt.target.value})}
                      />
                      </InputGroup>

                                            <p></p>
                                                                  <p></p>

                      <Button variant="danger" id="basic-addon2" onClick={this.ceoSetBot.bind(this)}>Change bot authorization</Button>

                    </Col>


          </Row>

          <Row style={{height: '44px'}}></Row>

        <Row>


        <Col md={10}>
          <h3>Settings</h3>

          <Table striped bordered hover size="sm">
              <thead>
              <tr>
                <th>Duration Minutes</th>
                <th>Min Bank For Challenge</th>
                <th>Wei Per Token</th>
                <th>Timeout Minutes</th>
                <th>Service Costs Enabled</th>
              </tr>
              </thead>
              <tbody>
              <tr>
              <td>
                  <FormControl
                      value={this.state.settings.ceoDurationMinutes}
                      onChange={evt => this.settings('ceoDurationMinutes', evt.target.value)}
                    />
              </td>
              <td>
                  <FormControl
                      value={this.state.settings.ceoMinBankForChallenge}
                      onChange={evt => this.settings('ceoMinBankForChallenge', evt.target.value)}
                    />
              </td>
              <td>
                  <FormControl
                      value={this.state.settings.ceoWeiPerToken}
                      onChange={evt => this.settings('ceoWeiPerToken', evt.target.value)}
                    />
              </td>
              <td>
                  <FormControl
                      value={this.state.settings.ceoTimeoutMinutes}
                      onChange={evt => this.settings('ceoTimeoutMinutes', evt.target.value)}
                    />
              </td>
              <td>
                  <FormControl
                      placeholder="1 /0"
                      aria-label="1 /0"
                      maxLength={1}
                      value={this.state.settings.ceoServiceCostsOn}
                      onChange={evt => this.settings('ceoServiceCostsOn', evt.target.value)}
                    />
              </td>
              </tr>
              </tbody>
              </Table>

                  <Button variant="danger" id="basic-addon2" onClick={this.ceoUpdate.bind(this)}>Update settings</Button>


        </Col>
        </Row>

                          <Row style={{height: '84px'}}></Row>
      </div>);
  }

  async ceoUpdateRules() {
      let payload = [];
      for(var i = 0; i < this.state.rules.length; i++) {
          let r = this.state.rules[i];
          payload.push(r.threshold);
          payload.push(r.rewardForPoint);
      }
      let ctr = await contract();
      let t = ctr.methods.ceoUpdateRules(payload);
      await this.transact(ctr, t);
  }

  async ceoSetBot() {
      console.log(JSON.stringify({
          ceoAuthBots: {
              auth: this.state.inputBotAuth,
              bots: [this.state.inputBot],
          }
      }));
      let ctr = await contract();
      let t = ctr.methods.ceoAuthBots(this.state.inputBotAuth, [this.state.inputBot]);
      await this.transact(ctr, t);
  }

  async transact(ctr, setData) {
      var gasPrice = web3.eth.gasPrice;

      await setData
          .estimateGas(
              {
                  from: this.state.ceo,
                  to: contract().address,
                  gasPrice: gasPrice
              }, async (error, estimatedGas) => {

                  console.log('gas Price: ' + gasPrice);
                  console.log('Estimated Transaction gas: ' + estimatedGas);

                  console.log ('sending Transaction to the contract');

                  const transaction = {
                    from: this.state.ceo,
                    to: ctr.address,
                    value: '0x00',
                    gas: estimatedGas + 1,
                    gasPrice: gasPrice + 1,
                  }


                  await setData.send( transaction, function(err, txHash) {
                    if (err != null) {
                           console.error("Error while sending transaction: " + err);
                         }
                         else{
                           console.log("Transaction Sent here's you  txHash: " + txHash);
                         }
                  });

      });
  }

  async ceoUpdate() {
    let minBankForChallenge = this.state.settings.ceoMinBankForChallenge;
    let duration = this.state.settings.ceoDurationMinutes * 60;
    let weiPerToken = this.state.settings.ceoWeiPerToken;
    let requestTimeout = this.state.settings.ceoTimeoutMinutes * 60;
    let serviceCostsEnabled = (this.state.settings.ceoServiceCostsOn == "1");

    let ctr = await contract();
    let t = ctr.methods.ceoUpdate(minBankForChallenge, duration, weiPerToken, requestTimeout, serviceCostsEnabled);
    await this.transact(ctr, t);
  }

  footerUI() {
      return (<Row style={{fontSize: '14px'}}>

      <Col md={6}>
            <ListGroup variant="flush">
              <ListGroup.Item>Код контракта опубликован <a href="https://github.com/crackhd/tg_partner_contract">на Github</a></ListGroup.Item>
                <ListGroup.Item>Код бота опубликован <a href="https://github.com/crackhd/tg_partner">на Github</a></ListGroup.Item>
                  <ListGroup.Item>Код этой странички опубликован <a href="https://github.com/crackhd/tg_partner_web">на Github</a></ListGroup.Item>
              </ListGroup>
      </Col>

          <Col md={6}>
          <ul>
          <li>Если вы создали кампанию и ничего не происходит, вы сможете получить компенсацию за потраченный с вашей стороны газ. Для этого можно отправить транзакцию Sell с суммой 0</li>
          <li>один пользователь одновременно может выполнять лишь одну кампанию до ее завершения (либо до <code>Sell(0)</code>, если кампания повисла)</li>
          </ul>
          </Col>
      </Row>);
  }

  render() {
    return (<div className="App container">
    <Row style={{height: '58px'}}></Row>

    <Row>
      <Col md={6}>
        <Jumbotron>
          <h1>Партнерка</h1>
          <p></p>
          <p></p>
          <p>
            Здесь можно добавить свою <span className="dotted-ul" id="campaigns">рекламную кампанию</span> для автоматического
            получения вознаграждения.
          </p>


          <UncontrolledTooltip target="campaigns">
            Вы можете получить вознаграждение в криптовалюте за <strong>просмотры</strong> к публикуемым постам.
            Для этого, перед тем, как лить свои просмотры, нужно создать с помощью этого контракта "челлендж" к посту, указав URL.
          </UncontrolledTooltip>

          <div>
              <p style={{color: 'gray'}}>
                1⃣ Открываем <a href="https://crackhd.github.io/tg_partner_web">страницу</a> смарт-контракта (<strong>готово!</strong>)
              </p><p>
                2⃣ Копируем ссылку на какой-нибудь пост в Telegram, которому мы хотим долить просмотров
              </p><p>
                3⃣ Вставляем ссылку в поле URL и жмем <Badge variant="primary">New Challenge</Badge>
              </p><p>
                4⃣ В течении <strong>{this.state.durationMinutes}</strong> последующих минут просмотры поста считаются контрактом вашими, фиксируется вознаграждение в виде 💎
              </p><p>
                5⃣ Меняем 💎 на {this.ETH()}. Для этого на странице контракта есть кнопка <Badge variant="primary">Sell</Badge>
              </p>
          </div>
          <p style={{height:16}}></p>
          <p>
          <a href="https://academy.binance.com/ru/blockchain/what-are-smart-contracts" target="_blank">
            <Button variant="info">Как это работает?</Button>
          </a>
          </p>
        </Jumbotron>
        </Col>

    <Col md={6}>

        {this.tooltipsUI()}

        { this.state.web3Ready
            ? this.newChallengeUI()
            : (<div>
                <p><Button variant="success" onClick={this.initWeb3.bind(this)}>Начать работу</Button></p>
              </div>) }

          { this.state.web3Ready
              ? this.statusUI()
              : null
          }

      </Col>

    </Row>

    { this.state.web3Ready
        ? (<Row style={{height: '44px'}}></Row>)
        : null
    }

    <Row style={{height: '54px'}}></Row>


    { this.state.web3Ready
        ? this.tableUI()
        : null
    }

    <Row style={{height: '84px'}}></Row>

    {
        this.state.web3Ready
            ? this.sellUI()
            : null
    }

    <Row style={{height: '64px'}}></Row>

    {
        this.state.web3Ready
            ? this.quotesUI()
            : null
    }

    <Row style={{height: '84px'}}></Row>

    {
        this.state.web3Ready
            ? this.footerUI()
            : null
    }

    {
        this.state.web3Ready && this.isCEO()
            ? this.ceoUI()
            : null
    }

        </div>
      );
    }
}

export default App;
