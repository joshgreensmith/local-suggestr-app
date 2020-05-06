import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import OpenSnapper from './OpenSnapper.png'
import ClosedSnapper from './ClosedSnapper.png'
import 'rc-slider/assets/index.css';
import Slider from 'rc-slider';
const Range = Slider.Range;

const num_of_qs = 9;

const slider_style = { width: 400, margin: 50 };

class QuestionBox extends React.Component {
    render() {
        const q = this.props.questionData;
        const pool_size = this.props.pool_size;
        const q_num = this.props.q_num;

        return (
            <div className = 'QuestionBox'>
                <div className = 'Question'> 
                    {q['Question']} 
                </div>

                {q_num > 1 && 
                <div className = 'PrevButton'
                    onClick = {() => this.props.onClick('Previous')} >
                    Previous
                </div> }
                
                {q_num > 0 && 
                <div className = 'NextButton'
                    onClick = {() => this.props.onClick('Next')}>
                    Next
                </div> }

                {q_num > 0 && 
                <div className = 'PoolSizeBox'>
                    Sampling from {pool_size} films!
                </div>
                }

            </div>
        )     
    }
}

class ResponseBox extends React.Component {
    render() {
        const selectedResponses = this.props.selectedResponses;
        const responses = this.props.responses.map(response => {
            return (
                <ResponseButton
                response_text = {response}
                key = {response}
                isSelected = {selectedResponses.includes(response)}
                onClick={() => this.props.onClick(response)}
                />
            )
        });    
        return (
            <div className = 'ResponseBox'>
                {responses}
            </div>
        )
    }
}

class ResponseButton extends React.Component {
    render() {
        return (
            <div className = 'ResponseButtonContainer'
            onClick = {this.props.onClick}>
                <img src = {this.props.isSelected ? ClosedSnapper : OpenSnapper}
                className = 'SnapperImage'
                alt = 'Error: Image not loaded'/>

                <div className = 'ResponseButtonText'>{this.props.response_text}</div>
            </div>
            
        )
    }
}

class RecommendationsBox extends React.Component {
    render() {
        if (this.props.recommendations.length > 0) {
            const recommendations = this.props.recommendations.map(recommendation => {
                return(
                    <Recommendation key = {recommendation['Title']}
                    data = {recommendation} />
                )
            });
            return (
                <div className = 'RecommendationsBox'>
                    {recommendations}
                </div>
            )
        }
        else {
            return(
                <div>No recommendations found!</div>
            )
        }
    }
}

class Recommendation extends React.Component {
    render() {
        const data = this.props.data;
        return (
            <div className = 'RecommendationContainer'>
                <img src = {OpenSnapper}
                className = 'SnapperImage'
                alt = 'Error: Image not loaded'/>

                <div className = 'RecommendationData'>
                    <div>
                        <img className ='PosterImage' 
                        src = {data['Poster']} 
                        alt = 'No image found'/>
                    </div>

                    <div className = 'RecommendationTextDiv'>
                        <b><a className = 'RecommendationTitle'
                        href={data['Trailer']} 
                        target="_blank">
                            {this.props.data['Title']}
                        </a></b>
                        <p>IMDB rating = {data['imdbRating']}</p>
                        <p>{data['Plot']}</p>
                    </div>
                    
                    
                </div>
            </div>
        )
    }
}

class SuggestrApp extends React.Component {
    // Initialise the state
    constructor(props) {
        super(props);
        this.state = {
            question_number: 0,
            pool_size: 0,
            completed_all_qs: false,
            got_responses: false,
            all_questions: {
                "0":{
                    "Question":  "Answer 10 questions and get a film you actually want to watch!",
                    "Responses": ["Begin"]
                }
            }
        };
    }

    // Get all questions on first mount
    componentDidMount() {
        this.getQuestions();
        document.title = "Suggestr";
    }

    getQuestions = () => {
        fetch('/api/getAllQuestions')
        .then((response) => response.json())
        .then((data) => {
            this.setState({ all_questions: data }, () => {
                console.log('Questions loaded');
                console.log(data);
            });
        });
    }
    
    getPoolSize = () => {
        const all_questions = this.state.all_questions;
        fetch('/api/getPoolSize', {
            method: 'post',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              },
            body: JSON.stringify(all_questions),
        })
        .then((response) => response.json())
        .then((data) => {
            this.setState({
                pool_size: data['pool_size']
            })
        })
        .catch((error) => {
            console.error('Error', error);
        })
    }

    getRecommendations = () => {
        const all_questions = this.state.all_questions;
        fetch('/api/getAllRecommendations', {
            method: 'post',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              },
            body: JSON.stringify(all_questions),
        })
        .then((response) => response.json())
        .then((data) => {
            this.setState({
                got_responses: true,
                recommendations: data
            })
        })
        .catch((error) => {
            console.error('Error', error);
        })
    }

    handleClick(response) {
        // Deal with multiple reponse questions differently to single response questions
        const cur_q_num = this.state.question_number;
        const cur_q_num_str = this.state.question_number.toString();
        const cur_all_qs = this.state.all_questions;
        const cur_q = cur_all_qs[cur_q_num_str];
        const cur_q_multiple_responses = cur_q['Multiple responses'];

        if(response == 'Next') {
            // Check that we haven't reached the end of the questions and update this.state.completed_all_qs if so
            if(cur_q_num === num_of_qs) {
                this.setState({completed_all_qs: true});
                this.getRecommendations();
            }
            else {
                this.setState( {question_number: cur_q_num + 1} );
            }
        } else if(response == 'Previous') { 
            // Don't show previous button on first question so don't need to worry about boundary case
            this.setState( {question_number: cur_q_num - 1} );
        } else {
            if(cur_q_multiple_responses) {
                // Add response to array in current question
                if('User response' in cur_q) {
                    // Check if response already in user response and remove it if so
                    if(cur_q['User response'].includes(response)) {
                        // Remove response for user response
                        var new_responses = cur_q['User response'];
                        new_responses = new_responses.filter(e => e !== response);
                        var new_all_qs = cur_all_qs;
                        new_all_qs[cur_q_num_str]['User response'] = new_responses;
                    } else {
                        var new_responses = cur_q['User response'];
                        new_responses.push(response);
                        var new_all_qs = cur_all_qs;
                        new_all_qs[cur_q_num_str]['User response'] = new_responses;
                    }               
                } else {
                    // Create array with one element of the first response
                    var new_all_qs = cur_all_qs;
                    new_all_qs[cur_q_num_str]['User response'] = [response];
                }
                this.setState({all_questions: new_all_qs});
            } else {
                // Add user response to all_questions and update question_number when an option is selected
                var new_all_qs = cur_all_qs;
                new_all_qs[cur_q_num_str]['User response'] = response;
                // var response_index = cur_all_qs[cur_q_num_str]['Responses'].indexOf(response);
                // new_all_qs[cur_q_num_str]['User response index'] = response_index;
                        
                // Check that we haven't reached the end of the questions and update this.state.completed_all_qs if so
                if(cur_q_num === num_of_qs) {
                    this.setState({completed_all_qs: true});
                    this.getRecommendations();
                }
                else {
                    this.setState( {all_questions: new_all_qs} );
                    this.setState( {question_number: cur_q_num + 1} );
                } 
            }
        }
        
        this.getPoolSize();
        console.log(cur_q_num, this.state.all_questions)
    }

    handleSliderChange(value) {
        const cur_q_num_str = this.state.question_number.toString();
        const cur_all_qs = this.state.all_questions;
        
        var new_all_qs = cur_all_qs;
        new_all_qs[cur_q_num_str]['User response'] = value;

        this.setState({all_questions: new_all_qs});
    }

    handleSliderAfterChange(value) {
        this.getPoolSize();
    }

    render() {
        const completed_all_qs = this.state.completed_all_qs;
        const got_responses = this.state.got_responses;
        const recommendations = this.state.recommendations;
        if(completed_all_qs) {
            if(got_responses) {
                return (
                    <div className = 'SuggestrApp'>
                        <div className = 'RecommendationsTitleBox'>
                            <div className = 'RecommendationTitleText'>
                                Recommendations
                            </div>

                            <div className = 'RecommendationTitleSecondaryText'>
                                Click on the title link to go to a trailer
                            </div>
                        </div>
                        <RecommendationsBox recommendations = {recommendations}/>
                    </div>
                )
            } else {
                return (
                    <div className ='LoadingResponses'>Loading responses</div>
                )
            }
        } else {
            const all_qs = this.state.all_questions;
            const q_num = this.state.question_number;
            const q = all_qs[q_num.toString()];
            const slider_question = q['Slider question'];
            const multiple_responses = q['Multiple responses'];
            const responses_arr = q['Responses'];
            const pool_size = this.state.pool_size;

            var selected_responses;
            if(multiple_responses) {
                selected_responses = 'User response' in q ? q['User response'] : [];
            } else {
                selected_responses = 'User response' in q ? [q['User response']] : [];
            }

            if(slider_question) {
                const slider_min = q['Slider range'][0];
                const slider_max = q['Slider range'][1];
                const cur_slider_val = q['User response'];
                const slider_units = q['Slider units'];
                const slider_step = q['Slider step'];

                return (
                    <div className = 'SuggestrApp'>
                        <QuestionBox
                            questionData = {q}
                            pool_size = {pool_size}
                            onClick = {response => this.handleClick(response)}
                            q_num = {q_num}/>

                        <ResponseButton 
                            onClick = {null}
                            isSelected = {true}
                            response_text = {cur_slider_val[0] + slider_units + ' to ' + cur_slider_val[1] + slider_units} />

                        <div style = {slider_style}>
                            <Range 
                                key = {q_num}
                                allowCross = {false}
                                min = {slider_min}
                                max = {slider_max}
                                defaultValue = {cur_slider_val}
                                onChange = {(value) => this.handleSliderChange(value)}
                                onAfterChange = {(value) => this.handleSliderAfterChange(value)} 
                                step = {slider_step} />
                        </div>
                        
                    </div>
                )
            } else {
                return (
                    <div className = 'SuggestrApp'>
                        <QuestionBox
                            questionData = {q}
                            pool_size = {pool_size} 
                            onClick = {response => this.handleClick(response)}
                            q_num = {q_num}/>

                        <ResponseBox 
                            responses={responses_arr}
                            selectedResponses = {selected_responses}
                            onClick = {response => this.handleClick(response)}/>
                    </div>
                )
            }
        }
    }
}


ReactDOM.render(
    <SuggestrApp />,
    document.getElementById('root')
)

