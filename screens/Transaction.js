import React, { Component } from "react";
import { 
    View,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Text,
    ImageBackground,
    Image,
} from "react-native";
import { db } from "../config";
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  Timestamp, 
  addDoc, 
  updateDoc, 
  increment, 
  query, 
  getDocs,
  where,
  orderBy,
  limit,
 } from "firebase/firestore"; 



const bgImage = require("../assets/background2.png");
const appIcon = require("../assets/appIcon.png");
const appName = require("../assets/appName.png");

export default class TransactionScreen extends Component {
    constructor(props) {
        super(props);
        this.state = {
          bookId: "",
          studentId: "",
          bookName: "",
          studentName: "",
        };
      }

    handleTransaction = async() => {
        
        var { bookId, studentId } = this.state;
        await this.getBooksDetails(bookId);
        await this.getStudentDetails(studentId);
        
        var transactionType = await this.checkBookAvailability(bookId) //chegar a disponibilidade do livro
        console.log(transactionType)
        // transactionType pose ser igual a:
        // "issued", "false" ou "return"
        
        if (!transactionType){
         this.setState({bookId: "", studentId: ""})
          alert("O livro não existe no banco de dados")
        } 
        else if(transactionType === "issued"){  
          var isEligible = await this.checkStudentEligibilityForBookIssue(studentId)

          if(isEligible){
            var { bookName, studentName } = this.state;  
            this.initiateBookIssue(bookId, studentId, bookName, studentName);
            alert("Livro entregue para o aluno")   
          }
        } else {
            var isEligible = await this.checkStudentEligibilityForBookReturn(studentId, bookId)
            console.log(isEligible)
            if(isEligible){
              var { bookName, studentName } = this.state; 
              this.initiateBookReturn(bookId, studentId, bookName, studentName);
              alert("Livro devolvido para a biblioteca") 
            }

          }
          
    };
    initiateBookIssue = async (bookId, studentId, bookName, studentName) => {
        const docTrasancData = {
          studentId: studentId,
          studentName: studentName,
          bookId: bookId,
          bookName: bookName,
          date: Timestamp.now().toDate(),
          transaction_type: "issued",
        }
        const docRef = await addDoc(collection(db, "transactions"), docTrasancData);
        console.log("Documento criado com id:", docRef.id)

        const bookRef = doc(db, "books", bookId);
        await updateDoc(bookRef, {is_book_available: false})
        
        const studentRef = doc(db, "students", studentId);
        await updateDoc(studentRef, {number_of_books_issued: increment(1)})
      
        this.setState({
          bookId: "",
          studentId: "",
        });
      };
      
    initiateBookReturn = async (bookId, studentId, bookName, studentName) => {
      const docTrasancData = {
        studentId: studentId,
        studentName: studentName,
        bookId: bookId,
        bookName: bookName,
        date: Timestamp.now().toDate(),
        transaction_type: "return",
      }
      const docRef = await addDoc(collection(db, "transactions"), docTrasancData);
      console.log("Documento criado com id:", docRef.id)

      const bookRef = doc(db, "books", bookId);
      await updateDoc(bookRef, {is_book_available: true})
      
      const studentRef = doc(db, "students", studentId);
      await updateDoc(studentRef, {number_of_books_issued: increment(-1)})
      
      this.setState({
        bookId: "",
        studentId: "",
      });
    };

    getBooksDetails = async(bookId) =>{
      bookId = bookId.trim() //remove espaços antes ou depois 
      const docRef = doc(db, "books", bookId);
      const docSnap = await getDoc(docRef);
      console.log(docSnap.data())
      var dadosDoLivro = docSnap.data()
      if(docSnap.exists()){ //exists() - função que verifica a existência do doc
        this.setState({bookName: dadosDoLivro.book_name})
        console.log("Passou por aqui e pegou o nome do livro")
      }else{
        //alert("Livro não encontrado")
        console.log("Não existe esse doc do livro")
      }
    };
    getStudentDetails = async(studentId) =>{
      studentId = studentId.trim() //remove espaços antes ou depois 
      const docRef = doc(db, "students", studentId);
      const docSnap = await getDoc(docRef);
      console.log(docSnap.data())
      var dadosDoEstudante = docSnap.data()
      if(docSnap.exists()){
       this.setState({studentName: dadosDoEstudante.student_name})
       console.log("Passou por aqui e pegou o nome do Estudante")
      }else{
        //alert("Estudante não encontrado")
        console.log("Não existe esse doc do aluno")
      }
    };

    checkBookAvailability = async(bookId) => {
      const docRef = doc(db, "books", bookId);
      const docSnap = await getDoc(docRef);
      console.log(docSnap.data())
      var dadosDoLivro = docSnap.data()
      
      var transactionType = ""; //vazia
      if(!docSnap.exists()){ //verifica se o livro não existe -- lógica inversa (!)
        transactionType = false
      }
      else{ //ação se ele existir
        transactionType = dadosDoLivro.is_book_available ? "issued"  : "return" // Operador Ternário = condição - ? ação caso verdadeiro - : ação caso falso
      }

      return transactionType
    };

    checkStudentEligibilityForBookIssue = async (studentId) =>{
      const docRef = doc(db, "students", studentId);
      const docSnap = await getDoc(docRef);
      console.log(docSnap.data())
      var dadosDoAluno = docSnap.data()
      
      var isStudentEligible = ""; //vazia
      if(!docSnap.exists()){ //verifica se o aluno não existe -- lógica inversa (!)
      isStudentEligible = false;

      }else{
        if(dadosDoAluno.number_of_books_issued < 2){
          isStudentEligible = true;
        }else{
          isStudentEligible = false;
          alert("O aluno já retirou dois livros! Devolva!")
          this.setState({bookId:"", studentId:"",})
        }
    }
    return isStudentEligible;
    };

    checkStudentEligibilityForBookReturn = async (studentId, bookId) =>{
      var isStudentEligible = "";
      
      const q = query(collection(db, "transactions"), where("book_id", "==", bookId),orderBy("date", "desc"),limit(1));
      
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
      // doc.data() is never undefined for query doc snapshots
      console.log(doc.id, " => ", doc.data());
     
      
      var lastBookTransaction = doc.data();
        if(lastBookTransaction.student_id === studentId ){
          isStudentEligible = true;
        }else{
          isStudentEligible = false;
          alert("O livro não foi retirado por este aluno!");
          this.setState({
            bookId: "",
            studentId: ""
          });
        }
      console.log("aluno que retirou ou não"+isStudentEligible)  
      });
      
     
      return isStudentEligible;
    }

  render() {
    const { bookId, studentId } = this.state;
    return (
        <View style={styles.container}>
        <ImageBackground source={bgImage} style={styles.bgImage}>
          <View style={styles.upperContainer}>
            <Image source={appIcon} style={styles.appIcon} />
            <Image source={appName} style={styles.appName} />
          </View>
          <View style={styles.lowerContainer}>
            <View style={styles.textinputContainer}>
              <TextInput
                style={styles.textinput}
                placeholder={"ID do Livro"}
                placeholderTextColor={"#FFFFFF"}
                onChangeText={(text)=>{this.setState({bookId: text})}}
                value={bookId}
              />
              <View
                style={styles.scanbutton}
              >
                <Text style={styles.scanbuttonText}>Livro</Text>
              </View>
            </View>
            <View style={[styles.textinputContainer, { marginTop: 25 }]}>
              <TextInput
                style={styles.textinput}
                placeholder={"ID do Estudante"}
                placeholderTextColor={"#FFFFFF"}
                onChangeText={(text)=>{this.setState({studentId: text})}}
                value={studentId}
              />
              <View
                style={styles.scanbutton}
              >
                <Text style={styles.scanbuttonText}>Aluno</Text>
              </View>
            </View>
            <TouchableOpacity
                style={[styles.button, {marginTop: 20}]}
                onPress={this.handleTransaction}
          >
              <Text style={styles.buttonText}>Buscar</Text>
          </TouchableOpacity>
          <Text style={styles.buttonText}>{this.state.studentName}</Text>
          </View>
        </ImageBackground>
      </View>
    );
  }
}

const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "#5653D4"
    },
    text: {
      color: "#ffff",
      fontSize: 15
    },
    button: {
      width: "43%",
      height: 55,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "#F48D20",
      borderRadius: 15
    },
    buttonText: {
      fontSize: 15,
      color: "#FFFFFF"
    },
    bgImage: {
      flex: 1,
      resizeMode: "cover",
      justifyContent: "center"
    },
    upperContainer: {
      flex: 0.5,
      justifyContent: "center",
      alignItems: "center"
    },
  appIcon: {
      width: 200,
      height: 200,
      resizeMode: "contain",
      marginTop: 20
    },
  appName: {
      width: 180,
      resizeMode: "contain"
    },
    lowerContainer: {
      flex: 0.5,
      alignItems: "center"
    },
  textinputContainer: {
      borderWidth: 2,
      borderRadius: 10,
      flexDirection: "row",
      backgroundColor: "#9DFD24",
      borderColor: "#FFFFFF"
    },
  textinput: {
      width: "57%",
      height: 50,
      padding: 10,
      borderColor: "#FFFFFF",
      borderRadius: 10,
      borderWidth: 3,
      fontSize: 18,
      backgroundColor: "#5653D4",
      fontFamily: "Rajdhani_600SemiBold",
      color: "#FFFFFF"
    },
    scanbutton: {
      width: 100,
      height: 50,
      backgroundColor: "#9DFD24",
      borderTopRightRadius: 10,
      borderBottomRightRadius: 10,
      justifyContent: "center",
      alignItems: "center"
    },
  scanbuttonText: {
      fontSize: 20,
      color: "#0A0101",
      fontFamily: "Rajdhani_600SemiBold"
    }
  });