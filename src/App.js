import React from 'react';
import logo from './logo.svg';
import './App.css';
import { InputGroup, FormControl, Jumbotron, Button, Alert, Row, Col, Table, Card, ListGroup, Badge } from 'react-bootstrap';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
        usdToEther: 15,
        examples: [],
        challenges: [],
        durationMinutes: 500,
        rubyToEther: 13,
        totalSupplyUsd: 150,
        totalSupply: 11,
        totalBankUsd: 150,
        totalBank: 111,
        averageRewardUsd: 10,
        averageRewardRuby: 2,
        myBalanceUsd: 1,
        myBalanceRuby: 2,
    };
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
                1⃣ Открываем страницу <a href="https://crackhd.github.com/tg_partner_web">смарт-контракта</a> (<strong>готово!</strong>)
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
    <InputGroup className="mb-3">
    <FormControl
      placeholder="https://t.me/channel/123"
      aria-label="Telegram post URL"
    />
    <InputGroup.Append>
      <Button variant="primary" id="basic-addon2">New Challenge</Button>
    </InputGroup.Append>
    </InputGroup>

        <div style={{height: '24px'}}></div>

        <Alert variant="warning">
          Нужно работать с компа из браузера Chrome или Firefox
        </Alert>
        <Alert variant="info">
          <p>Нужно расширение <a href="https://metamask.io" target="_blank"><strong>Metamask</strong></a>, в котором хранится эфир - криптовалюта.
          Ethereum можно купить с карты, нажав в окошке Metamask <strong>Deposit</strong>.</p>
          <p>Заработанная награда выводится из контракта обратно в ETH.</p>
        </Alert>

        <div style={{height: '24px'}}></div>

        <h3>Текущие ставки</h3>

            <div style={{height: '7px'}}></div>

            <Card>
              <ListGroup variant="flush">
                <ListGroup.Item>Бюджет ~ <strong>${this.state.totalSupplyUsd}</strong> (💎{this.state.totalSupply})</ListGroup.Item>
                <ListGroup.Item>Средняя награда за хит ~ <strong>${this.state.averageRewardUsd}</strong> (💎{this.state.averageRewardRuby})</ListGroup.Item>
                <ListGroup.Item>Остаток бюджета ~ <strong>${this.state.totalBankUsd}</strong> (💎{this.state.totalBank})</ListGroup.Item>
                <ListGroup.Item>
&nbsp;&nbsp;&nbsp;&nbsp;$1&nbsp;=&nbsp;{this.state.usdToEther} ETH<br/><br/>



{this.state.examples.map((example, i) => {
// Return the element. Also pass key
return (<div>

    &nbsp;&nbsp;&nbsp;&nbsp;за {example.views} просмотров:<br/>
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;=&nbsp;{example.rubys} в 💎<br/>
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;=&nbsp;{example.ether} в ETH<br/>
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;=&nbsp;~&nbsp;{example.usd} при выводе<br/><br/>
    </div>)
})}

                </ListGroup.Item>
              </ListGroup>
            </Card>

      </Col>

    </Row>

    <Row>
    <Col md={12}>
    <h2>Последние кампании</h2>

        <Button small sm variant="success" borderless stripped>обновить</Button>

        <div style={{height: '7px'}}></div>

            <Table striped bordered hover size="sm">
                <thead>
                <tr>
                  <th>Статус</th>
                  <th>Канал</th>
                  <th>Пост</th>
                  <th>Время</th>
                  <th>Награда</th>
                </tr>
                </thead>
                <tbody>
                {this.state.challenges.map((challenge, i) => {
                // Return the element. Also pass key
                return (<tr>
                  <td>{challenge.status}</td>
                  <td>{challenge.group}</td>
                  <td>{challenge.resource}</td>
                  <td>{challenge.time}</td>
                  <td>{challenge.reward}</td>
                </tr>)
                })}
                </tbody>
                </Table>

            { this.state.challenges.length == 0
                ? (<span>Нет недавних кампаний</span>)
                : null
            }



            { this.state.challenges.length > 10
                ? (<Button small sm variant="success" borderless stripped>обновить</Button>)
                : null
            }
    </Col>
    </Row>

    <Row style={{height: '14px'}}></Row>

    <Row>
    <Col md={6}>
      <Jumbotron>
    <h2>Вывести деньги</h2>
                <Card>
                  <ListGroup variant="flush">
                    <ListGroup.Item>Ваш баланс ~ <strong>${this.state.myBalanceUsd}</strong> (💎{this.state.myBalanceRuby} доступно для вывода)</ListGroup.Item>
                      <ListGroup.Item>Установлен курс, за 💎выплата: <strong>{this.state.rubyToEther}</strong> ETH</ListGroup.Item>
                    </ListGroup>
                    </Card>


        <div style={{height: '7px'}}></div>
    <InputGroup className="mb-3">
      <InputGroup.Prepend>
      Сколько выводим? &nbsp;&nbsp;
        </InputGroup.Prepend>
      <InputGroup.Prepend>
        <InputGroup.Text>💎</InputGroup.Text>
      </InputGroup.Prepend>
      <FormControl aria-label="Вывести деньги (в рубинах)" />
      <InputGroup.Append>
        <Button sm variant="primary">Sell</Button>
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

    </Row>

    <Row style={{fontSize: '14px'}}>

    <Col md={6}>
          <ListGroup variant="flush">
            <ListGroup.Item>Код контракта опубликован <a href="https://github.com/crackhd/tg_partner_contract">на Github</a></ListGroup.Item>
              <ListGroup.Item>Код бота опубликован <a href="https://github.com/crackhd/tg_partner">на Github</a></ListGroup.Item>
                <ListGroup.Item>Код этой странички опубликован <a href="https://github.com/crackhd/tg_partner_web">на Github</a></ListGroup.Item>
            </ListGroup>
    </Col>

        <Col md={6}>
        <ul>
        <li>Если вы запускаете кампании и ничего не происходит, то вы можете получить компенсацию за потраченный с вашей стороны газ. Для этого можно отправить транзакцию Sell с суммой 0</li>
        <li>один пользователь одновременно может выполнять лишь одну кампанию до ее завершения (либо до <code>Sell(0)</code>, если кампания повисла)</li>
        </ul>
        </Col>
    </Row>

        </div>
      );
    }
}

export default App;
