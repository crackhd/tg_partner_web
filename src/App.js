/* global BigInt */

import React from 'react';
import './App.css';
import { InputGroup, FormControl, Jumbotron, Button, Alert, Row, Col, Table, Card, ListGroup, Badge } from 'react-bootstrap';
import Web3 from 'web3';
import { address, abi, network } from './Reward.jsx';

const usdToEther = 0.0044;
const etherToUsd = 228.28;
const exampleRewardPoints = [ 50, 150, 400, 800 ];

const web3 = new Web3(Web3.givenProvider || "http://localhost:8545");

function contract() {
   let ctr = new web3.eth.Contract(abi, address);
   ctr.options.gas = 5000000;

   return ctr;
}

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
        contract: null,
        web3Ready: false,

        durationMinutes: 600,
        rubyToEther: 0,
        totalSupplyUsd: 0,
        totalSupply: 0,
        totalBankUsd: 0,
        totalBank: 0,
        balanceEther: 0,

        examples: [],
        challenges: [],

        averageRewardUsd: 0,
        averageRewardRuby: 0,
        myBalanceRuby: 0,
        myBalanceUsd: 0,

        sellValue: 0
    };
  }

   componentDidMount() {
        window.addEventListener('load', this.onCompleted.bind(this));
     }

     onCompleted() {
         web3.eth.getAccounts().then(this.updateContract.bind(this));
     }

  updateSellValue(evt) {
    this.setState({
      sellValue: evt.target.value
    });
  }

    sell() {
        let ctr = contract();
        let amount = this.state.sellValue;
        web3.eth.requestAccounts().then(function(accounts) {
            if(accounts.length == 0) {
                alert("No accounts");
                return;
            }
            let account = accounts[0];
            ctr.methods.sell(amount).send({from: account, value: 0, gaslimit: 100000});
        })
    }

  async loadExamples() {
      var examples = [];

      var sumRewards = 0;

      let ctr = contract();

      for(var i = 0; i < exampleRewardPoints.length; i++) {
          let points = exampleRewardPoints[i];
          let reward = Number(BigInt(await ctr.methods.rewardForPoints(points, "").call()));
          examples.push({
              views: points,
              rubys: reward,
              ether: reward * this.state.rubyToEther,
              usd: reward * this.state.rubyToEther * etherToUsd,
          });
          sumRewards += reward / points;
      }

      let avgRewardRubys = (sumRewards / exampleRewardPoints.length).toFixed(0);

      this.setState({
          examples: examples,
          averageRewardRuby: avgRewardRubys,
          averageRewardUsd: avgRewardRubys * this.state.rubyToEther * etherToUsd,
      });
  }

  updateContract() {

      var self = this;
      web3.eth.getAccounts().then(function(accounts) {
          if(accounts.length == 0) {
              return alert('Нет вижу аккаунты Ethereum!');
          }

          web3.eth.net.getNetworkType().then(async function(netId) {
              if(netId != network) {
                  console.log("Network not matching " + netId);
                  return;
              }

             let ctr = contract();

             let duration = Number(await ctr.methods.duration().call()) / 60;
             let weiPerToken = BigInt(await ctr.methods.weiPerToken().call());
             let totalSupply = BigInt(await ctr.methods.totalSupply().call());
             let totalBank = BigInt(await ctr.methods.totalBank().call());

             let rubyToEther = Number(Web3.utils.fromWei(weiPerToken.toString(), 'ether'));

             let balanceWei = await web3.eth.getBalance(address);
             let balanceEther = Number(Web3.utils.fromWei(balanceWei.toString(), 'ether'));

             let user = accounts[0];
             let userBalance = Number(BigInt(await ctr.methods.balanceOf(user).call()));
             let userBalanceEther = (userBalance * rubyToEther).toFixed();

             self.setState({
                 web3Ready: true,
                 balanceEther: balanceEther,
                 durationMinutes: Number(duration),
                 rubyToEther: rubyToEther,
                 totalSupply: Number(totalSupply),
                 totalSupplyUsd: Number(totalSupply) * rubyToEther * etherToUsd,
                 totalBank: Number(totalBank),
                 totalBankUsd: Number(totalBank) * rubyToEther * etherToUsd,
                 myBalanceRuby: userBalance,
                 myBalanceUsd: userBalance * rubyToEther * etherToUsd,
             }, () => {
                  self.loadChallenges();
                  self.loadExamples();
             })
         });
      });
  }

  loadChallenges() {
      var challenges = this.state.challenges;
      challenges.push({
          group: 'test',
          status: 'CONFIRMED',
          resource: 123,
          time: '13 min',
          reward: 10,
          before: 2,
          after: 10,
      });
      this.setState({
          challenges: challenges
      });
  }

  initWeb3() {
      var self = this;
      web3.eth.requestAccounts().then(function(accounts) {
          if(accounts.length == 0) {
              alert('У вас нет кошельков Metamask в браузере. Интерфейс недоступен');
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
        <p>Необходимо расширение <a href="https://metamask.io" target="_blank"><strong>Metamask</strong></a> для работы с смарт-контрактов Ethereum.
        Ethereum можно купить с карты, ищите варианты <strong>Deposit</strong>.</p>
        <p>Заработанная награда выводится из контракта обратно в ETH.</p>
      </Alert>

      <div style={{height: '24px'}}></div>
      </div>)
  }


  newChallengeUI() {
      return (<Jumbotron>
          <InputGroup className="mb-3">

          <FormControl disabled={!this.state.web3Ready}
            placeholder="https://t.me/channel/123"
            aria-label="Telegram post URL"
          />
          <InputGroup.Append>
            <Button variant="primary" id="basic-addon2" disabled={!this.state.web3Ready}>New Challenge</Button>
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
                <ListGroup.Item>Средняя награда за хит ~ <strong>${this.state.averageRewardUsd.toFixed(4)}</strong> (💎{this.state.averageRewardRuby})</ListGroup.Item>
              </Card>
      </div>)
  }

  exampleCardItemUI(example, i) {
      return (<div key={i}>

          &nbsp;&nbsp;&nbsp;&nbsp;за {example.views} просмотров:<br/>
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;=&nbsp;{example.rubys} в 💎<br/>
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;=&nbsp;<strong>{example.ether}</strong> в ETH<br/>
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;=&nbsp;~&nbsp;<strong>${example.usd.toFixed(4)}</strong> при выводе<br/><br/>
          </div>);
  }

  quotesUI() {
      return (<div>

          <div style={{height: '24px'}}></div>

          <Row>
            <h3>Калькулятор ставок</h3>

                <p>&nbsp;&nbsp;&nbsp;&nbsp;$1&nbsp;=&nbsp;{usdToEther} ETH (💎{usdToEther / this.state.rubyToEther})<br/><br/></p>
          </Row>

          <div style={{height: '7px'}}></div>

          <Row>

              <Col md={6}>
                  <Card>
                    <ListGroup variant="flush">
                      <ListGroup.Item>
                            {this.state.examples.slice(0, 2).map(this.exampleCardItemUI.bind(this))}
                      </ListGroup.Item>
                    </ListGroup>
                  </Card>
              </Col>
              <Col md={6}>
                  <Card>
                    <ListGroup variant="flush">
                      <ListGroup.Item>
                            {this.state.examples.slice(2).map(this.exampleCardItemUI.bind(this))}
                      </ListGroup.Item>
                    </ListGroup>
                  </Card>
              </Col>
          </Row>

      </div>)
  }

  tableUI() {
      return (<Row>
      <Col md={12}>
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
                    <td>{challenge.status}</td>
                    <td>{challenge.group}</td>
                    <td>{challenge.resource}</td>
                    <td>{challenge.time}</td>
                    <td>{challenge.before} / {challenge.after}</td>
                    <td>💎{challenge.reward} <strong>~ ${(challenge.reward * this.state.rubyToEther).toFixed(3)}</strong></td>
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
                        <ListGroup.Item>Установлен курс, за 💎 выплата: <strong>{this.state.rubyToEther}</strong> ETH</ListGroup.Item>
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
        <FormControl aria-label="Вывести деньги (в рубинах)" value={this.state.inputValue} onChange={evt => this.updateSellValue(evt)} disabled={!this.state.web3Ready} />
        <InputGroup.Append>
          <Button variant="primary" onClick={this.sell.bind(this)} disabled={!this.state.web3Ready}>Sell</Button>
        </InputGroup.Append>
      </InputGroup>
        </Jumbotron>
      </Col>


      <Col md={6}>
      <Alert variant="secondary">
          Для создания кампаний потребуется изначально закинуть немного ETH на своей кошелек
          для оплаты расходов на <i>gas</i>.

          Покупки на $4 должно хватить, что бы множество раз создавать кампании.
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
          <p>
            Здесь можно добавить свою рекламную кампанию для автоматического
            получения вознаграждения.
          </p>
          <div>
              <p style={{color: 'gray'}}>
                1⃣ Открываем <a href="https://crackhd.github.com/tg_partner_web">страницу</a> смарт-контракта (<strong>готово!</strong>)
              </p><p>
                2⃣ Копируем ссылку на какой-нибудь пост в Telegram, которому мы хотим долить просмотров
              </p><p>
                3⃣ Вставляем ссылку в поле URL и жмем <Badge variant="primary">New Challenge</Badge>
              </p><p>
                4⃣ В течении <strong>{this.state.durationMinutes}</strong> последующих минут просмотры поста считаются контрактом вашими, фиксируется вознаграждение в виде 💎
              </p><p>
                5⃣ Зачисленные рубины 💎 выводим в Ethereum, что бы использовать как деньги. Для этого на странице контракта есть кнопка <Badge variant="primary">Sell</Badge>
              </p>
          </div>
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

        </div>
      );
    }
}

export default App;
